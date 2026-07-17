import * as teamsRepo from "../db/repos/teams";
import type { SqlClient } from "../db/sql-client";
import type { Team } from "../db/types";
import { internalError, notFoundError, validationError } from "./errors";
import type { ServiceResult, TeamDto } from "./types";

function toTeamDto(team: Team): TeamDto {
  return {
    ...team,
    canDeleteTeam: true,
  };
}

export async function listTeams(
  client: SqlClient
): Promise<ServiceResult<{ teams: TeamDto[] }>> {
  try {
    const teams = await teamsRepo.listTeams(client);
    return { ok: true, data: { teams: teams.map(toTeamDto) } };
  } catch {
    return { ok: false, error: internalError("Failed to list teams") };
  }
}

export async function getTeam(
  client: SqlClient,
  teamId: number
): Promise<ServiceResult<{ team: TeamDto }>> {
  try {
    const team = await teamsRepo.getTeamById(client, teamId);
    if (!team) return { ok: false, error: notFoundError("Team not found") };
    return { ok: true, data: { team: toTeamDto(team) } };
  } catch {
    return { ok: false, error: internalError("Failed to get team") };
  }
}

export async function createTeam(
  client: SqlClient,
  payload: { name?: string; notes?: string | null }
): Promise<ServiceResult<{ team: TeamDto }>> {
  const name = payload.name?.trim();
  if (!name)
    return { ok: false, error: validationError("Team name is required") };

  try {
    const team = await teamsRepo.createTeam(client, {
      name,
      notes: payload.notes ?? null,
    });
    return { ok: true, data: { team: toTeamDto(team) } };
  } catch {
    return { ok: false, error: internalError("Failed to create team") };
  }
}

export async function updateTeam(
  client: SqlClient,
  teamId: number,
  payload: { name?: string; notes?: string | null }
): Promise<ServiceResult<{ team: TeamDto }>> {
  if (payload.name !== undefined && !payload.name.trim()) {
    return { ok: false, error: validationError("Team name cannot be empty") };
  }

  try {
    const team = await teamsRepo.updateTeam(client, teamId, {
      name: payload.name?.trim(),
      notes: payload.notes,
    });
    if (!team) return { ok: false, error: notFoundError("Team not found") };
    return { ok: true, data: { team: toTeamDto(team) } };
  } catch {
    return { ok: false, error: internalError("Failed to update team") };
  }
}

export async function deleteTeam(
  client: SqlClient,
  teamId: number
): Promise<ServiceResult<null>> {
  try {
    const deleted = await teamsRepo.deleteTeam(client, teamId);
    if (!deleted) return { ok: false, error: notFoundError("Team not found") };
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: internalError("Failed to delete team") };
  }
}
