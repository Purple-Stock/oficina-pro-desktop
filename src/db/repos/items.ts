import { mapItemRow } from "../mappers";
import type { SqlClient } from "../sql-client";
import type { Item, ItemCustomFields } from "../types";

const ITEM_SELECT = `
  SELECT i.*, l.name AS location_name
  FROM items i
  LEFT JOIN locations l ON l.id = i.location_id
`;

export async function listTeamItems(
  client: SqlClient,
  teamId: number
): Promise<Item[]> {
  const rows = await client.select<Record<string, unknown>>(
    `${ITEM_SELECT} WHERE i.team_id = ? ORDER BY i.name ASC`,
    [teamId]
  );
  return rows.map(mapItemRow);
}

export async function getItemById(
  client: SqlClient,
  itemId: number,
  teamId?: number
): Promise<Item | null> {
  const params: unknown[] = [itemId];
  let sql = `${ITEM_SELECT} WHERE i.id = ?`;
  if (teamId != null) {
    sql += ` AND i.team_id = ?`;
    params.push(teamId);
  }
  const row = await client.selectOne<Record<string, unknown>>(sql, params);
  return row ? mapItemRow(row) : null;
}

export async function createItem(
  client: SqlClient,
  data: {
    teamId: number;
    name?: string | null;
    sku?: string | null;
    barcode?: string | null;
    cost?: number | null;
    price?: number | null;
    itemType?: string | null;
    brand?: string | null;
    photoData?: string | null;
    initialQuantity?: number;
    currentStock?: number;
    minimumStock?: number;
    customFields?: ItemCustomFields | null;
    locationId?: number | null;
  }
): Promise<Item> {
  const initialQuantity = data.initialQuantity ?? 0;
  const currentStock = data.currentStock ?? initialQuantity;

  await client.execute(
    `INSERT INTO items (
      name, sku, barcode, cost, price, item_type, brand, photo_data,
      initial_quantity, current_stock, minimum_stock, custom_fields,
      team_id, location_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
    [
      data.name ?? null,
      data.sku ?? null,
      data.barcode ?? null,
      data.cost ?? null,
      data.price ?? null,
      data.itemType ?? null,
      data.brand ?? null,
      data.photoData ?? null,
      initialQuantity,
      currentStock,
      data.minimumStock ?? 0,
      data.customFields ? JSON.stringify(data.customFields) : null,
      data.teamId,
      data.locationId ?? null,
    ]
  );

  const row = await client.selectOne<Record<string, unknown>>(
    `${ITEM_SELECT} WHERE i.team_id = ? ORDER BY i.id DESC LIMIT 1`,
    [data.teamId]
  );
  if (!row) throw new Error("Failed to create item");
  return mapItemRow(row);
}

export async function updateItem(
  client: SqlClient,
  itemId: number,
  teamId: number,
  data: Partial<{
    name: string | null;
    sku: string | null;
    barcode: string | null;
    cost: number | null;
    price: number | null;
    itemType: string | null;
    brand: string | null;
    photoData: string | null;
    minimumStock: number;
    customFields: ItemCustomFields | null;
    locationId: number | null;
  }>
): Promise<Item | null> {
  const fieldMap: Record<string, unknown> = {
    name: data.name,
    sku: data.sku,
    barcode: data.barcode,
    cost: data.cost,
    price: data.price,
    item_type: data.itemType,
    brand: data.brand,
    photo_data: data.photoData,
    minimum_stock: data.minimumStock,
    custom_fields:
      data.customFields === undefined
        ? undefined
        : data.customFields
          ? JSON.stringify(data.customFields)
          : null,
    location_id: data.locationId,
  };

  const fields: string[] = [];
  const params: unknown[] = [];

  for (const [column, value] of Object.entries(fieldMap)) {
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      params.push(value);
    }
  }

  if (fields.length === 0) return getItemById(client, itemId, teamId);

  fields.push("updated_at = unixepoch()");
  params.push(itemId, teamId);

  await client.execute(
    `UPDATE items SET ${fields.join(", ")} WHERE id = ? AND team_id = ?`,
    params
  );
  return getItemById(client, itemId, teamId);
}

export async function deleteItem(
  client: SqlClient,
  itemId: number,
  teamId: number
): Promise<boolean> {
  await client.execute(`DELETE FROM items WHERE id = ? AND team_id = ?`, [
    itemId,
    teamId,
  ]);
  const row = await client.selectOne<{ id: number }>(
    `SELECT id FROM items WHERE id = ? AND team_id = ?`,
    [itemId, teamId]
  );
  return row == null;
}
