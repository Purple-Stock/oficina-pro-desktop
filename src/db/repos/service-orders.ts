import { mapServiceOrderItemRow, mapServiceOrderRow } from "../mappers";
import type { SqlClient } from "../sql-client";
import type {
  PaymentStatus,
  ServiceOrder,
  ServiceOrderItem,
  ServiceOrderItemKind,
  ServiceOrderStatus,
} from "../types";
import { createStockTransaction } from "./stock-transactions";

const ORDER_SELECT = `
  SELECT so.*,
    c.name AS client_name,
    v.plate AS vehicle_plate,
    TRIM(COALESCE(v.brand, '') || ' ' || COALESCE(v.model, '')) AS vehicle_label
  FROM service_orders so
  LEFT JOIN clients c ON c.id = so.client_id
  LEFT JOIN vehicles v ON v.id = so.vehicle_id
`;

const LINE_SELECT = `SELECT * FROM service_order_items`;

async function recomputeTotals(
  client: SqlClient,
  orderId: number,
  teamId: number,
  discount?: number
): Promise<void> {
  const lines = await client.select<Record<string, unknown>>(
    `${LINE_SELECT} WHERE service_order_id = ?`,
    [orderId]
  );
  let laborTotal = 0;
  let partsTotal = 0;
  for (const line of lines) {
    const kind = String(line.kind);
    const total = Number(line.line_total ?? 0);
    if (kind === "service") laborTotal += total;
    else partsTotal += total;
  }
  const order = await client.selectOne<Record<string, unknown>>(
    `SELECT discount FROM service_orders WHERE id = ? AND team_id = ?`,
    [orderId, teamId]
  );
  const disc = discount !== undefined ? discount : Number(order?.discount ?? 0);
  const total = Math.max(0, laborTotal + partsTotal - disc);
  await client.execute(
    `UPDATE service_orders
     SET labor_total = ?, parts_total = ?, discount = ?, total = ?, updated_at = unixepoch()
     WHERE id = ? AND team_id = ?`,
    [laborTotal, partsTotal, disc, total, orderId, teamId]
  );
}

export async function listTeamServiceOrders(
  client: SqlClient,
  teamId: number
): Promise<ServiceOrder[]> {
  const rows = await client.select<Record<string, unknown>>(
    `${ORDER_SELECT} WHERE so.team_id = ? ORDER BY so.opened_at DESC, so.id DESC`,
    [teamId]
  );
  return rows.map(mapServiceOrderRow);
}

export async function getServiceOrderById(
  client: SqlClient,
  orderId: number,
  teamId: number
): Promise<ServiceOrder | null> {
  const row = await client.selectOne<Record<string, unknown>>(
    `${ORDER_SELECT} WHERE so.id = ? AND so.team_id = ?`,
    [orderId, teamId]
  );
  if (!row) return null;
  const order = mapServiceOrderRow(row);
  const itemRows = await client.select<Record<string, unknown>>(
    `${LINE_SELECT} WHERE service_order_id = ? ORDER BY id ASC`,
    [orderId]
  );
  order.items = itemRows.map(mapServiceOrderItemRow);
  return order;
}

export async function createServiceOrder(
  client: SqlClient,
  data: {
    teamId: number;
    clientId?: number | null;
    vehicleId?: number | null;
    status?: ServiceOrderStatus;
    paymentStatus?: PaymentStatus;
    odometer?: number | null;
    complaint?: string | null;
    diagnosis?: string | null;
    notes?: string | null;
    discount?: number;
  }
): Promise<ServiceOrder> {
  await client.execute(
    `INSERT INTO service_orders (
      team_id, client_id, vehicle_id, status, payment_status, odometer,
      complaint, diagnosis, notes, discount, labor_total, parts_total, total,
      stock_debited, opened_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, unixepoch(), unixepoch(), unixepoch())`,
    [
      data.teamId,
      data.clientId ?? null,
      data.vehicleId ?? null,
      data.status ?? "open",
      data.paymentStatus ?? "pending",
      data.odometer ?? null,
      data.complaint ?? null,
      data.diagnosis ?? null,
      data.notes ?? null,
      data.discount ?? 0,
    ]
  );
  const row = await client.selectOne<Record<string, unknown>>(
    `${ORDER_SELECT} WHERE so.team_id = ? ORDER BY so.id DESC LIMIT 1`,
    [data.teamId]
  );
  if (!row) throw new Error("Failed to create service order");
  const order = mapServiceOrderRow(row);
  order.items = [];
  return order;
}

export async function updateServiceOrder(
  client: SqlClient,
  orderId: number,
  teamId: number,
  data: Partial<{
    clientId: number | null;
    vehicleId: number | null;
    status: ServiceOrderStatus;
    paymentStatus: PaymentStatus;
    odometer: number | null;
    complaint: string | null;
    diagnosis: string | null;
    notes: string | null;
    discount: number;
  }>
): Promise<ServiceOrder | null> {
  const existing = await getServiceOrderById(client, orderId, teamId);
  if (!existing) return null;
  if (existing.status === "closed" && data.status && data.status !== "closed") {
    throw new Error("Closed service orders cannot be reopened in v1");
  }

  const fieldMap: Record<string, unknown> = {
    client_id: data.clientId,
    vehicle_id: data.vehicleId,
    status: data.status,
    payment_status: data.paymentStatus,
    odometer: data.odometer,
    complaint: data.complaint,
    diagnosis: data.diagnosis,
    notes: data.notes,
    discount: data.discount,
  };
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [column, value] of Object.entries(fieldMap)) {
    if (value !== undefined) {
      sets.push(`${column} = ?`);
      values.push(value);
    }
  }

  const closing =
    data.status === "closed" &&
    existing.status !== "closed" &&
    !existing.stockDebited;

  if (closing) {
    sets.push("closed_at = unixepoch()");
  }

  if (sets.length > 0) {
    sets.push("updated_at = unixepoch()");
    values.push(orderId, teamId);
    await client.execute(
      `UPDATE service_orders SET ${sets.join(", ")} WHERE id = ? AND team_id = ?`,
      values
    );
  }

  if (data.discount !== undefined) {
    await recomputeTotals(client, orderId, teamId, data.discount);
  }

  if (closing) {
    await debitPartsStock(client, orderId, teamId);
  }

  return getServiceOrderById(client, orderId, teamId);
}

async function debitPartsStock(
  client: SqlClient,
  orderId: number,
  teamId: number
): Promise<void> {
  const lines = await client.select<Record<string, unknown>>(
    `${LINE_SELECT} WHERE service_order_id = ? AND kind = 'part'`,
    [orderId]
  );
  for (const line of lines) {
    const refId = line.ref_id == null ? null : Number(line.ref_id);
    const qty = Number(line.quantity ?? 0);
    if (!refId || qty <= 0) continue;
    await createStockTransaction(client, {
      itemId: refId,
      teamId,
      transactionType: "stock_out",
      quantity: qty,
      notes: `OS #${orderId}`,
      destinationKind: "service_order",
      destinationLabel: `OS #${orderId}`,
    });
  }
  await client.execute(
    `UPDATE service_orders SET stock_debited = 1, updated_at = unixepoch()
     WHERE id = ? AND team_id = ?`,
    [orderId, teamId]
  );
}

export async function addServiceOrderItem(
  client: SqlClient,
  orderId: number,
  teamId: number,
  data: {
    kind: ServiceOrderItemKind;
    refId?: number | null;
    description: string;
    quantity: number;
    unitPrice: number;
  }
): Promise<ServiceOrderItem> {
  const order = await getServiceOrderById(client, orderId, teamId);
  if (!order) throw new Error("Service order not found");
  if (order.status === "closed")
    throw new Error("Cannot add items to a closed service order");

  const quantity = data.quantity > 0 ? data.quantity : 1;
  const unitPrice = data.unitPrice >= 0 ? data.unitPrice : 0;
  const lineTotal = quantity * unitPrice;

  await client.execute(
    `INSERT INTO service_order_items (
      service_order_id, kind, ref_id, description, quantity, unit_price, line_total,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
    [
      orderId,
      data.kind,
      data.refId ?? null,
      data.description,
      quantity,
      unitPrice,
      lineTotal,
    ]
  );
  await recomputeTotals(client, orderId, teamId);
  const row = await client.selectOne<Record<string, unknown>>(
    `${LINE_SELECT} WHERE service_order_id = ? ORDER BY id DESC LIMIT 1`,
    [orderId]
  );
  if (!row) throw new Error("Failed to add service order item");
  return mapServiceOrderItemRow(row);
}

export async function removeServiceOrderItem(
  client: SqlClient,
  orderId: number,
  teamId: number,
  itemId: number
): Promise<boolean> {
  const order = await getServiceOrderById(client, orderId, teamId);
  if (!order) throw new Error("Service order not found");
  if (order.status === "closed")
    throw new Error("Cannot remove items from a closed service order");

  const line = await client.selectOne<Record<string, unknown>>(
    `${LINE_SELECT} WHERE id = ? AND service_order_id = ?`,
    [itemId, orderId]
  );
  if (!line) return false;
  await client.execute(
    `DELETE FROM service_order_items WHERE id = ? AND service_order_id = ?`,
    [itemId, orderId]
  );
  await recomputeTotals(client, orderId, teamId);
  return true;
}

export async function deleteServiceOrder(
  client: SqlClient,
  orderId: number,
  teamId: number
): Promise<boolean> {
  const order = await getServiceOrderById(client, orderId, teamId);
  if (!order) return false;
  if (order.stockDebited)
    throw new Error("Cannot delete a service order that already debited stock");
  await client.execute(
    `DELETE FROM service_orders WHERE id = ? AND team_id = ?`,
    [orderId, teamId]
  );
  return true;
}
