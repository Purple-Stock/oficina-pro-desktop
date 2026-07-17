import * as itemsRepo from "../db/repos/items";
import * as teamsRepo from "../db/repos/teams";
import type { SqlClient } from "../db/sql-client";
import type { ItemCustomFields } from "../db/types";
import { internalError, notFoundError, validationError } from "./errors";
import type { ItemDto, ServiceResult } from "./types";

export async function listTeamItems(
  client: SqlClient,
  teamId: number
): Promise<ServiceResult<{ items: ItemDto[] }>> {
  const team = await teamsRepo.getTeamById(client, teamId);
  if (!team) return { ok: false, error: notFoundError("Team not found") };

  try {
    const items = await itemsRepo.listTeamItems(client, teamId);
    return { ok: true, data: { items } };
  } catch {
    return { ok: false, error: internalError("Failed to list items") };
  }
}

export async function createTeamItem(
  client: SqlClient,
  teamId: number,
  payload: {
    name?: string | null;
    sku?: string | null;
    barcode?: string | null;
    cost?: number | null;
    price?: number | null;
    itemType?: string | null;
    brand?: string | null;
    photoData?: string | null;
    initialQuantity?: number;
    minimumStock?: number;
    customFields?: ItemCustomFields | null;
    locationId?: number | null;
  }
): Promise<ServiceResult<{ item: ItemDto }>> {
  const team = await teamsRepo.getTeamById(client, teamId);
  if (!team) return { ok: false, error: notFoundError("Team not found") };

  const name = payload.name?.trim();
  if (!name)
    return { ok: false, error: validationError("Item name is required") };

  try {
    const item = await itemsRepo.createItem(client, {
      teamId,
      ...payload,
      name,
    });
    return { ok: true, data: { item } };
  } catch {
    return { ok: false, error: internalError("Failed to create item") };
  }
}

export async function updateTeamItem(
  client: SqlClient,
  teamId: number,
  itemId: number,
  payload: Partial<{
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
): Promise<ServiceResult<{ item: ItemDto }>> {
  const existing = await itemsRepo.getItemById(client, itemId, teamId);
  if (!existing) return { ok: false, error: notFoundError("Item not found") };

  if (
    payload.name !== undefined &&
    payload.name !== null &&
    !payload.name.trim()
  ) {
    return { ok: false, error: validationError("Item name cannot be empty") };
  }

  try {
    const item = await itemsRepo.updateItem(client, itemId, teamId, {
      ...payload,
      name: payload.name?.trim() ?? payload.name,
    });
    if (!item) return { ok: false, error: notFoundError("Item not found") };
    return { ok: true, data: { item } };
  } catch {
    return { ok: false, error: internalError("Failed to update item") };
  }
}

export async function deleteTeamItem(
  client: SqlClient,
  teamId: number,
  itemId: number
): Promise<ServiceResult<null>> {
  const existing = await itemsRepo.getItemById(client, itemId, teamId);
  if (!existing) return { ok: false, error: notFoundError("Item not found") };

  try {
    const deleted = await itemsRepo.deleteItem(client, itemId, teamId);
    if (!deleted) return { ok: false, error: notFoundError("Item not found") };
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: internalError("Failed to delete item") };
  }
}
