import { mapClientRow } from "../mappers";
import type { SqlClient } from "../sql-client";
import type { Client } from "../types";

const CLIENT_SELECT = `
  SELECT c.*,
    (SELECT COUNT(*) FROM vehicles v WHERE v.client_id = c.id) AS vehicle_count
  FROM clients c
`;

export async function listTeamClients(
  client: SqlClient,
  teamId: number
): Promise<Client[]> {
  const rows = await client.select<Record<string, unknown>>(
    `${CLIENT_SELECT} WHERE c.team_id = ? ORDER BY c.name ASC`,
    [teamId]
  );
  return rows.map(mapClientRow);
}

export async function getClientById(
  client: SqlClient,
  clientId: number,
  teamId?: number
): Promise<Client | null> {
  const params: unknown[] = [clientId];
  let sql = `${CLIENT_SELECT} WHERE c.id = ?`;
  if (teamId != null) {
    sql += ` AND c.team_id = ?`;
    params.push(teamId);
  }
  const row = await client.selectOne<Record<string, unknown>>(sql, params);
  return row ? mapClientRow(row) : null;
}

export async function createClient(
  client: SqlClient,
  data: {
    teamId: number;
    name: string;
    phone?: string | null;
    email?: string | null;
    document?: string | null;
    notes?: string | null;
  }
): Promise<Client> {
  await client.execute(
    `INSERT INTO clients (
      team_id, name, phone, email, document, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`,
    [
      data.teamId,
      data.name,
      data.phone ?? null,
      data.email ?? null,
      data.document ?? null,
      data.notes ?? null,
    ]
  );
  const row = await client.selectOne<Record<string, unknown>>(
    `${CLIENT_SELECT} WHERE c.team_id = ? ORDER BY c.id DESC LIMIT 1`,
    [data.teamId]
  );
  if (!row) throw new Error("Failed to create client");
  return mapClientRow(row);
}

export async function updateClient(
  client: SqlClient,
  clientId: number,
  teamId: number,
  data: Partial<{
    name: string;
    phone: string | null;
    email: string | null;
    document: string | null;
    notes: string | null;
  }>
): Promise<Client | null> {
  const fieldMap: Record<string, unknown> = {
    name: data.name,
    phone: data.phone,
    email: data.email,
    document: data.document,
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
  if (sets.length === 0) return getClientById(client, clientId, teamId);
  sets.push("updated_at = unixepoch()");
  values.push(clientId, teamId);
  await client.execute(
    `UPDATE clients SET ${sets.join(", ")} WHERE id = ? AND team_id = ?`,
    values
  );
  return getClientById(client, clientId, teamId);
}

export async function deleteClient(
  client: SqlClient,
  clientId: number,
  teamId: number
): Promise<boolean> {
  const existing = await getClientById(client, clientId, teamId);
  if (!existing) return false;
  await client.execute(`DELETE FROM clients WHERE id = ? AND team_id = ?`, [
    clientId,
    teamId,
  ]);
  return true;
}
