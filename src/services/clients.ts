import * as clientsRepo from "../db/repos/clients";
import * as teamsRepo from "../db/repos/teams";
import type { SqlClient } from "../db/sql-client";
import { internalError, notFoundError, validationError } from "./errors";
import type { ClientDto, ServiceResult } from "./types";

export async function listTeamClients(
  client: SqlClient,
  teamId: number
): Promise<ServiceResult<{ clients: ClientDto[] }>> {
  const team = await teamsRepo.getTeamById(client, teamId);
  if (!team) return { ok: false, error: notFoundError("Team not found") };
  try {
    const clients = await clientsRepo.listTeamClients(client, teamId);
    return { ok: true, data: { clients } };
  } catch {
    return { ok: false, error: internalError("Failed to list clients") };
  }
}

export async function createTeamClient(
  client: SqlClient,
  teamId: number,
  payload: {
    name?: string;
    phone?: string | null;
    email?: string | null;
    document?: string | null;
    notes?: string | null;
  }
): Promise<ServiceResult<{ client: ClientDto }>> {
  const team = await teamsRepo.getTeamById(client, teamId);
  if (!team) return { ok: false, error: notFoundError("Team not found") };
  const name = payload.name?.trim();
  if (!name)
    return { ok: false, error: validationError("Client name is required") };
  try {
    const created = await clientsRepo.createClient(client, {
      teamId,
      name,
      phone: payload.phone,
      email: payload.email,
      document: payload.document,
      notes: payload.notes,
    });
    return { ok: true, data: { client: created } };
  } catch {
    return { ok: false, error: internalError("Failed to create client") };
  }
}

export async function updateTeamClient(
  client: SqlClient,
  teamId: number,
  clientId: number,
  payload: Partial<{
    name: string;
    phone: string | null;
    email: string | null;
    document: string | null;
    notes: string | null;
  }>
): Promise<ServiceResult<{ client: ClientDto }>> {
  if (payload.name !== undefined && !payload.name.trim()) {
    return { ok: false, error: validationError("Client name is required") };
  }
  try {
    const updated = await clientsRepo.updateClient(client, clientId, teamId, {
      ...payload,
      name: payload.name?.trim(),
    });
    if (!updated)
      return { ok: false, error: notFoundError("Client not found") };
    return { ok: true, data: { client: updated } };
  } catch {
    return { ok: false, error: internalError("Failed to update client") };
  }
}

export async function deleteTeamClient(
  client: SqlClient,
  teamId: number,
  clientId: number
): Promise<ServiceResult<null>> {
  try {
    const ok = await clientsRepo.deleteClient(client, clientId, teamId);
    if (!ok) return { ok: false, error: notFoundError("Client not found") };
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: internalError("Failed to delete client") };
  }
}
