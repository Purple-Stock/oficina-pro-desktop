import { mapLocationRow } from "../mappers";
import type { SqlClient } from "../sql-client";
import type { Location } from "../types";

export async function listTeamLocations(
  client: SqlClient,
  teamId: number
): Promise<Location[]> {
  const rows = await client.select<Record<string, unknown>>(
    `SELECT * FROM locations WHERE team_id = ? ORDER BY name ASC`,
    [teamId]
  );
  return rows.map(mapLocationRow);
}

export async function getLocationById(
  client: SqlClient,
  locationId: number
): Promise<Location | null> {
  const row = await client.selectOne<Record<string, unknown>>(
    `SELECT * FROM locations WHERE id = ?`,
    [locationId]
  );
  return row ? mapLocationRow(row) : null;
}

export async function createLocation(
  client: SqlClient,
  data: { teamId: number; name: string; description?: string | null }
): Promise<Location> {
  await client.execute(
    `INSERT INTO locations (name, description, team_id, created_at, updated_at)
     VALUES (?, ?, ?, unixepoch(), unixepoch())`,
    [data.name, data.description ?? null, data.teamId]
  );
  const row = await client.selectOne<Record<string, unknown>>(
    `SELECT * FROM locations WHERE team_id = ? AND name = ? ORDER BY id DESC LIMIT 1`,
    [data.teamId, data.name]
  );
  if (!row) throw new Error("Failed to create location");
  return mapLocationRow(row);
}

export async function updateLocation(
  client: SqlClient,
  locationId: number,
  data: { name?: string; description?: string | null }
): Promise<Location | null> {
  const fields: string[] = [];
  const params: unknown[] = [];

  if (data.name !== undefined) {
    fields.push("name = ?");
    params.push(data.name);
  }
  if (data.description !== undefined) {
    fields.push("description = ?");
    params.push(data.description);
  }

  if (fields.length === 0) return getLocationById(client, locationId);

  fields.push("updated_at = unixepoch()");
  params.push(locationId);

  await client.execute(
    `UPDATE locations SET ${fields.join(", ")} WHERE id = ?`,
    params
  );
  return getLocationById(client, locationId);
}

export async function deleteLocation(
  client: SqlClient,
  locationId: number
): Promise<boolean> {
  await client.execute(`DELETE FROM locations WHERE id = ?`, [locationId]);
  const row = await client.selectOne<{ id: number }>(
    `SELECT id FROM locations WHERE id = ?`,
    [locationId]
  );
  return row == null;
}
