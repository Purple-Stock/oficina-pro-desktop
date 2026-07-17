import { mapWorkshopServiceRow } from "../mappers";
import type { SqlClient } from "../sql-client";
import type { WorkshopService } from "../types";

const SERVICE_SELECT = `SELECT * FROM services`;

export async function listTeamServices(
  client: SqlClient,
  teamId: number
): Promise<WorkshopService[]> {
  const rows = await client.select<Record<string, unknown>>(
    `${SERVICE_SELECT} WHERE team_id = ? ORDER BY name ASC`,
    [teamId]
  );
  return rows.map(mapWorkshopServiceRow);
}

export async function getServiceById(
  client: SqlClient,
  serviceId: number,
  teamId?: number
): Promise<WorkshopService | null> {
  const params: unknown[] = [serviceId];
  let sql = `${SERVICE_SELECT} WHERE id = ?`;
  if (teamId != null) {
    sql += ` AND team_id = ?`;
    params.push(teamId);
  }
  const row = await client.selectOne<Record<string, unknown>>(sql, params);
  return row ? mapWorkshopServiceRow(row) : null;
}

export async function createService(
  client: SqlClient,
  data: {
    teamId: number;
    name: string;
    description?: string | null;
    price?: number;
    estimatedMinutes?: number;
  }
): Promise<WorkshopService> {
  await client.execute(
    `INSERT INTO services (
      team_id, name, description, price, estimated_minutes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
    [
      data.teamId,
      data.name,
      data.description ?? null,
      data.price ?? 0,
      data.estimatedMinutes ?? 0,
    ]
  );
  const row = await client.selectOne<Record<string, unknown>>(
    `${SERVICE_SELECT} WHERE team_id = ? ORDER BY id DESC LIMIT 1`,
    [data.teamId]
  );
  if (!row) throw new Error("Failed to create service");
  return mapWorkshopServiceRow(row);
}

export async function updateService(
  client: SqlClient,
  serviceId: number,
  teamId: number,
  data: Partial<{
    name: string;
    description: string | null;
    price: number;
    estimatedMinutes: number;
  }>
): Promise<WorkshopService | null> {
  const fieldMap: Record<string, unknown> = {
    name: data.name,
    description: data.description,
    price: data.price,
    estimated_minutes: data.estimatedMinutes,
  };
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [column, value] of Object.entries(fieldMap)) {
    if (value !== undefined) {
      sets.push(`${column} = ?`);
      values.push(value);
    }
  }
  if (sets.length === 0) return getServiceById(client, serviceId, teamId);
  sets.push("updated_at = unixepoch()");
  values.push(serviceId, teamId);
  await client.execute(
    `UPDATE services SET ${sets.join(", ")} WHERE id = ? AND team_id = ?`,
    values
  );
  return getServiceById(client, serviceId, teamId);
}

export async function deleteService(
  client: SqlClient,
  serviceId: number,
  teamId: number
): Promise<boolean> {
  const existing = await getServiceById(client, serviceId, teamId);
  if (!existing) return false;
  await client.execute(`DELETE FROM services WHERE id = ? AND team_id = ?`, [
    serviceId,
    teamId,
  ]);
  return true;
}
