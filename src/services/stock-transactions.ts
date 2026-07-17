import * as itemsRepo from "../db/repos/items";
import * as stockTransactionsRepo from "../db/repos/stock-transactions";
import * as teamsRepo from "../db/repos/teams";
import type { SqlClient } from "../db/sql-client";
import type { StockTransactionType } from "../db/types";
import { internalError, notFoundError, validationError } from "./errors";
import type { ServiceResult, StockTransactionDto } from "./types";

export async function listTeamTransactions(
  client: SqlClient,
  teamId: number
): Promise<ServiceResult<{ transactions: StockTransactionDto[] }>> {
  const team = await teamsRepo.getTeamById(client, teamId);
  if (!team) return { ok: false, error: notFoundError("Team not found") };

  try {
    const transactions = await stockTransactionsRepo.listTeamTransactions(
      client,
      teamId
    );
    return { ok: true, data: { transactions } };
  } catch {
    return { ok: false, error: internalError("Failed to list transactions") };
  }
}

export async function createTeamStockTransaction(
  client: SqlClient,
  teamId: number,
  payload: {
    itemId?: number;
    transactionType?: StockTransactionType;
    quantity?: number;
    notes?: string | null;
    sourceLocationId?: number | null;
    destinationLocationId?: number | null;
    destinationKind?: string | null;
    destinationLabel?: string | null;
  }
): Promise<ServiceResult<{ transaction: StockTransactionDto }>> {
  const team = await teamsRepo.getTeamById(client, teamId);
  if (!team) return { ok: false, error: notFoundError("Team not found") };

  if (!payload.itemId)
    return { ok: false, error: validationError("Item is required") };
  if (!payload.transactionType) {
    return {
      ok: false,
      error: validationError("Transaction type is required"),
    };
  }
  if (payload.quantity == null || payload.quantity < 0) {
    return {
      ok: false,
      error: validationError("Quantity must be zero or greater"),
    };
  }

  const item = await itemsRepo.getItemById(client, payload.itemId, teamId);
  if (!item) return { ok: false, error: notFoundError("Item not found") };

  if (payload.transactionType === "move" && !payload.destinationLocationId) {
    return {
      ok: false,
      error: validationError("Destination location is required for move"),
    };
  }

  try {
    const transaction = await stockTransactionsRepo.createStockTransaction(
      client,
      {
        itemId: payload.itemId,
        teamId,
        transactionType: payload.transactionType,
        quantity: payload.quantity,
        notes: payload.notes ?? null,
        sourceLocationId:
          payload.sourceLocationId ??
          (payload.transactionType === "move" ? item.locationId : null),
        destinationLocationId: payload.destinationLocationId ?? null,
        destinationKind: payload.destinationKind ?? null,
        destinationLabel: payload.destinationLabel ?? null,
      }
    );
    return { ok: true, data: { transaction } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create transaction";
    if (message.includes("Insufficient stock")) {
      return { ok: false, error: validationError(message) };
    }
    return { ok: false, error: internalError(message) };
  }
}
