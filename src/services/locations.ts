import * as locationsRepo from "../db/repos/locations";
import * as teamsRepo from "../db/repos/teams";
import type { SqlClient } from "../db/sql-client";
import { internalError, notFoundError, validationError } from "./errors";
import type { LocationDto, ServiceResult } from "./types";

export async function listTeamLocations(
  client: SqlClient,
  teamId: number
): Promise<ServiceResult<{ locations: LocationDto[] }>> {
  const team = await teamsRepo.getTeamById(client, teamId);
  if (!team) return { ok: false, error: notFoundError("Team not found") };

  try {
    const locations = await locationsRepo.listTeamLocations(client, teamId);
    return { ok: true, data: { locations } };
  } catch {
    return { ok: false, error: internalError("Failed to list locations") };
  }
}

export async function createTeamLocation(
  client: SqlClient,
  teamId: number,
  payload: { name?: string; description?: string | null }
): Promise<ServiceResult<{ location: LocationDto }>> {
  const name = payload.name?.trim();
  if (!name)
    return { ok: false, error: validationError("Location name is required") };

  const team = await teamsRepo.getTeamById(client, teamId);
  if (!team) return { ok: false, error: notFoundError("Team not found") };

  try {
    const location = await locationsRepo.createLocation(client, {
      teamId,
      name,
      description: payload.description ?? null,
    });
    return { ok: true, data: { location } };
  } catch {
    return { ok: false, error: internalError("Failed to create location") };
  }
}

export async function updateTeamLocation(
  client: SqlClient,
  teamId: number,
  locationId: number,
  payload: { name?: string; description?: string | null }
): Promise<ServiceResult<{ location: LocationDto }>> {
  const existing = await locationsRepo.getLocationById(client, locationId);
  if (!existing || existing.teamId !== teamId) {
    return { ok: false, error: notFoundError("Location not found") };
  }

  if (payload.name !== undefined && !payload.name.trim()) {
    return {
      ok: false,
      error: validationError("Location name cannot be empty"),
    };
  }

  try {
    const location = await locationsRepo.updateLocation(client, locationId, {
      name: payload.name?.trim(),
      description: payload.description,
    });
    if (!location)
      return { ok: false, error: notFoundError("Location not found") };
    return { ok: true, data: { location } };
  } catch {
    return { ok: false, error: internalError("Failed to update location") };
  }
}

export async function deleteTeamLocation(
  client: SqlClient,
  teamId: number,
  locationId: number
): Promise<ServiceResult<null>> {
  const existing = await locationsRepo.getLocationById(client, locationId);
  if (!existing || existing.teamId !== teamId) {
    return { ok: false, error: notFoundError("Location not found") };
  }

  try {
    const deleted = await locationsRepo.deleteLocation(client, locationId);
    if (!deleted)
      return { ok: false, error: notFoundError("Location not found") };
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: internalError("Failed to delete location") };
  }
}
