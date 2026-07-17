import * as clientsRepo from "../db/repos/clients";
import * as teamsRepo from "../db/repos/teams";
import * as vehiclesRepo from "../db/repos/vehicles";
import type { SqlClient } from "../db/sql-client";
import { internalError, notFoundError, validationError } from "./errors";
import type { ServiceResult, VehicleDto } from "./types";

export async function listTeamVehicles(
  client: SqlClient,
  teamId: number
): Promise<ServiceResult<{ vehicles: VehicleDto[] }>> {
  const team = await teamsRepo.getTeamById(client, teamId);
  if (!team) return { ok: false, error: notFoundError("Team not found") };
  try {
    const vehicles = await vehiclesRepo.listTeamVehicles(client, teamId);
    return { ok: true, data: { vehicles } };
  } catch {
    return { ok: false, error: internalError("Failed to list vehicles") };
  }
}

export async function createTeamVehicle(
  client: SqlClient,
  teamId: number,
  payload: {
    clientId?: number;
    plate?: string;
    brand?: string | null;
    model?: string | null;
    year?: number | null;
    color?: string | null;
    odometer?: number | null;
    notes?: string | null;
  }
): Promise<ServiceResult<{ vehicle: VehicleDto }>> {
  const team = await teamsRepo.getTeamById(client, teamId);
  if (!team) return { ok: false, error: notFoundError("Team not found") };
  const plate = payload.plate?.trim();
  if (!plate)
    return { ok: false, error: validationError("Vehicle plate is required") };
  if (!payload.clientId)
    return { ok: false, error: validationError("Client is required") };
  const owner = await clientsRepo.getClientById(
    client,
    payload.clientId,
    teamId
  );
  if (!owner) return { ok: false, error: notFoundError("Client not found") };
  try {
    const vehicle = await vehiclesRepo.createVehicle(client, {
      teamId,
      clientId: payload.clientId,
      plate,
      brand: payload.brand,
      model: payload.model,
      year: payload.year,
      color: payload.color,
      odometer: payload.odometer,
      notes: payload.notes,
    });
    return { ok: true, data: { vehicle } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.toLowerCase().includes("unique")) {
      return {
        ok: false,
        error: validationError("A vehicle with this plate already exists"),
      };
    }
    return { ok: false, error: internalError("Failed to create vehicle") };
  }
}

export async function updateTeamVehicle(
  client: SqlClient,
  teamId: number,
  vehicleId: number,
  payload: Partial<{
    clientId: number;
    plate: string;
    brand: string | null;
    model: string | null;
    year: number | null;
    color: string | null;
    odometer: number | null;
    notes: string | null;
  }>
): Promise<ServiceResult<{ vehicle: VehicleDto }>> {
  if (payload.plate !== undefined && !payload.plate.trim()) {
    return { ok: false, error: validationError("Vehicle plate is required") };
  }
  if (payload.clientId !== undefined) {
    const owner = await clientsRepo.getClientById(
      client,
      payload.clientId,
      teamId
    );
    if (!owner) return { ok: false, error: notFoundError("Client not found") };
  }
  try {
    const vehicle = await vehiclesRepo.updateVehicle(
      client,
      vehicleId,
      teamId,
      {
        ...payload,
        plate: payload.plate?.trim(),
      }
    );
    if (!vehicle)
      return { ok: false, error: notFoundError("Vehicle not found") };
    return { ok: true, data: { vehicle } };
  } catch {
    return { ok: false, error: internalError("Failed to update vehicle") };
  }
}

export async function deleteTeamVehicle(
  client: SqlClient,
  teamId: number,
  vehicleId: number
): Promise<ServiceResult<null>> {
  try {
    const ok = await vehiclesRepo.deleteVehicle(client, vehicleId, teamId);
    if (!ok) return { ok: false, error: notFoundError("Vehicle not found") };
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: internalError("Failed to delete vehicle") };
  }
}
