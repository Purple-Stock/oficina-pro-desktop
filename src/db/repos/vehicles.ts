import { mapVehicleRow } from "../mappers";
import type { SqlClient } from "../sql-client";
import type { Vehicle } from "../types";

const VEHICLE_SELECT = `
  SELECT v.*, c.name AS client_name
  FROM vehicles v
  LEFT JOIN clients c ON c.id = v.client_id
`;

export async function listTeamVehicles(
  client: SqlClient,
  teamId: number
): Promise<Vehicle[]> {
  const rows = await client.select<Record<string, unknown>>(
    `${VEHICLE_SELECT} WHERE v.team_id = ? ORDER BY v.plate ASC`,
    [teamId]
  );
  return rows.map(mapVehicleRow);
}

export async function getVehicleById(
  client: SqlClient,
  vehicleId: number,
  teamId?: number
): Promise<Vehicle | null> {
  const params: unknown[] = [vehicleId];
  let sql = `${VEHICLE_SELECT} WHERE v.id = ?`;
  if (teamId != null) {
    sql += ` AND v.team_id = ?`;
    params.push(teamId);
  }
  const row = await client.selectOne<Record<string, unknown>>(sql, params);
  return row ? mapVehicleRow(row) : null;
}

export async function createVehicle(
  client: SqlClient,
  data: {
    teamId: number;
    clientId: number;
    plate: string;
    brand?: string | null;
    model?: string | null;
    year?: number | null;
    color?: string | null;
    odometer?: number | null;
    notes?: string | null;
  }
): Promise<Vehicle> {
  await client.execute(
    `INSERT INTO vehicles (
      team_id, client_id, plate, brand, model, year, color, odometer, notes,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
    [
      data.teamId,
      data.clientId,
      data.plate.toUpperCase().trim(),
      data.brand ?? null,
      data.model ?? null,
      data.year ?? null,
      data.color ?? null,
      data.odometer ?? null,
      data.notes ?? null,
    ]
  );
  const row = await client.selectOne<Record<string, unknown>>(
    `${VEHICLE_SELECT} WHERE v.team_id = ? ORDER BY v.id DESC LIMIT 1`,
    [data.teamId]
  );
  if (!row) throw new Error("Failed to create vehicle");
  return mapVehicleRow(row);
}

export async function updateVehicle(
  client: SqlClient,
  vehicleId: number,
  teamId: number,
  data: Partial<{
    clientId: number;
    plate: string;
    brand: string | null;
    model: string | null;
    year: number | null;
    color: string | null;
    odometer: number | null;
    notes: string | null;
  }>
): Promise<Vehicle | null> {
  const fieldMap: Record<string, unknown> = {
    client_id: data.clientId,
    plate:
      data.plate === undefined ? undefined : data.plate.toUpperCase().trim(),
    brand: data.brand,
    model: data.model,
    year: data.year,
    color: data.color,
    odometer: data.odometer,
    notes: data.notes,
  };
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [column, value] of Object.entries(fieldMap)) {
    if (value !== undefined) {
      sets.push(`${column} = ?`);
      values.push(value);
    }
  }
  if (sets.length === 0) return getVehicleById(client, vehicleId, teamId);
  sets.push("updated_at = unixepoch()");
  values.push(vehicleId, teamId);
  await client.execute(
    `UPDATE vehicles SET ${sets.join(", ")} WHERE id = ? AND team_id = ?`,
    values
  );
  return getVehicleById(client, vehicleId, teamId);
}

export async function deleteVehicle(
  client: SqlClient,
  vehicleId: number,
  teamId: number
): Promise<boolean> {
  const existing = await getVehicleById(client, vehicleId, teamId);
  if (!existing) return false;
  await client.execute(`DELETE FROM vehicles WHERE id = ? AND team_id = ?`, [
    vehicleId,
    teamId,
  ]);
  return true;
}
