import * as servicesRepo from "../db/repos/services";
import * as teamsRepo from "../db/repos/teams";
import type { SqlClient } from "../db/sql-client";
import { internalError, notFoundError, validationError } from "./errors";
import type { ServiceResult, WorkshopServiceDto } from "./types";

export async function listTeamWorkshopServices(
  client: SqlClient,
  teamId: number
): Promise<ServiceResult<{ services: WorkshopServiceDto[] }>> {
  const team = await teamsRepo.getTeamById(client, teamId);
  if (!team) return { ok: false, error: notFoundError("Team not found") };
  try {
    const services = await servicesRepo.listTeamServices(client, teamId);
    return { ok: true, data: { services } };
  } catch {
    return { ok: false, error: internalError("Failed to list services") };
  }
}

export async function createTeamWorkshopService(
  client: SqlClient,
  teamId: number,
  payload: {
    name?: string;
    description?: string | null;
    price?: number;
    estimatedMinutes?: number;
  }
): Promise<ServiceResult<{ service: WorkshopServiceDto }>> {
  const team = await teamsRepo.getTeamById(client, teamId);
  if (!team) return { ok: false, error: notFoundError("Team not found") };
  const name = payload.name?.trim();
  if (!name)
    return { ok: false, error: validationError("Service name is required") };
  try {
    const service = await servicesRepo.createService(client, {
      teamId,
      name,
      description: payload.description,
      price: payload.price,
      estimatedMinutes: payload.estimatedMinutes,
    });
    return { ok: true, data: { service } };
  } catch {
    return { ok: false, error: internalError("Failed to create service") };
  }
}

export async function updateTeamWorkshopService(
  client: SqlClient,
  teamId: number,
  serviceId: number,
  payload: Partial<{
    name: string;
    description: string | null;
    price: number;
    estimatedMinutes: number;
  }>
): Promise<ServiceResult<{ service: WorkshopServiceDto }>> {
  if (payload.name !== undefined && !payload.name.trim()) {
    return { ok: false, error: validationError("Service name is required") };
  }
  try {
    const service = await servicesRepo.updateService(
      client,
      serviceId,
      teamId,
      {
        ...payload,
        name: payload.name?.trim(),
      }
    );
    if (!service)
      return { ok: false, error: notFoundError("Service not found") };
    return { ok: true, data: { service } };
  } catch {
    return { ok: false, error: internalError("Failed to update service") };
  }
}

export async function deleteTeamWorkshopService(
  client: SqlClient,
  teamId: number,
  serviceId: number
): Promise<ServiceResult<null>> {
  try {
    const ok = await servicesRepo.deleteService(client, serviceId, teamId);
    if (!ok) return { ok: false, error: notFoundError("Service not found") };
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: internalError("Failed to delete service") };
  }
}
