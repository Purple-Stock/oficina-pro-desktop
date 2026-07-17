import { mapStockTransactionRow } from "../mappers";
import type { SqlClient } from "../sql-client";
import type { StockTransaction, StockTransactionType } from "../types";
import { getItemById } from "./items";

const TRANSACTION_SELECT = `
  SELECT st.*, i.name AS item_name
  FROM stock_transactions st
  LEFT JOIN items i ON i.id = st.item_id
`;

export async function listTeamTransactions(
  client: SqlClient,
  teamId: number
): Promise<StockTransaction[]> {
  const rows = await client.select<Record<string, unknown>>(
    `${TRANSACTION_SELECT} WHERE st.team_id = ? ORDER BY st.created_at DESC, st.id DESC`,
    [teamId]
  );
  return rows.map(mapStockTransactionRow);
}

export async function createStockTransaction(
  client: SqlClient,
  data: {
    itemId: number;
    teamId: number;
    transactionType: StockTransactionType;
    quantity: number;
    notes?: string | null;
    sourceLocationId?: number | null;
    destinationLocationId?: number | null;
    destinationKind?: string | null;
    destinationLabel?: string | null;
  }
): Promise<StockTransaction> {
  return client.transaction(async (tx) => {
    const item = await getItemById(tx, data.itemId, data.teamId);
    if (!item) throw new Error("Item not found for team");

    let newStock = item.currentStock;
    let newLocationId = item.locationId;

    if (data.transactionType === "stock_in") {
      newStock += data.quantity;
      if (data.destinationLocationId)
        newLocationId = data.destinationLocationId;
    } else if (data.transactionType === "stock_out") {
      if (newStock < data.quantity)
        throw new Error("Insufficient stock for stock out");
      newStock -= data.quantity;
    } else if (
      data.transactionType === "adjust" ||
      data.transactionType === "count"
    ) {
      newStock = data.quantity;
      if (data.destinationLocationId)
        newLocationId = data.destinationLocationId;
    } else if (data.transactionType === "move") {
      if (data.destinationLocationId)
        newLocationId = data.destinationLocationId;
    }

    await tx.execute(
      `INSERT INTO stock_transactions (
        item_id, team_id, transaction_type, quantity, notes,
        source_location_id, destination_location_id, destination_kind, destination_label,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
      [
        data.itemId,
        data.teamId,
        data.transactionType,
        data.quantity,
        data.notes ?? null,
        data.sourceLocationId ?? null,
        data.destinationLocationId ?? null,
        data.destinationKind ?? null,
        data.destinationLabel ?? null,
      ]
    );

    await tx.execute(
      `UPDATE items SET current_stock = ?, location_id = ?, updated_at = unixepoch()
       WHERE id = ? AND team_id = ?`,
      [Math.max(0, newStock), newLocationId, data.itemId, data.teamId]
    );

    const row = await tx.selectOne<Record<string, unknown>>(
      `${TRANSACTION_SELECT} WHERE st.team_id = ? ORDER BY st.id DESC LIMIT 1`,
      [data.teamId]
    );
    if (!row) throw new Error("Failed to create stock transaction");
    return mapStockTransactionRow(row);
  });
}
