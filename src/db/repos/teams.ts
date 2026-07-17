import { mapTeamRow } from "../mappers";
import type { SqlClient } from "../sql-client";
import type { Team } from "../types";

const TEAM_SELECT = `
  SELECT
    t.*,
    (SELECT COUNT(*) FROM items i WHERE i.team_id = t.id) AS item_count,
    (SELECT COUNT(*) FROM stock_transactions st WHERE st.team_id = t.id) AS transaction_count
  FROM teams t
`;

export async function listTeams(client: SqlClient): Promise<Team[]> {
  const rows = await client.select<Record<string, unknown>>(
    `${TEAM_SELECT} ORDER BY t.created_at DESC`
  );
  return rows.map(mapTeamRow);
}

export async function getTeamById(
  client: SqlClient,
  teamId: number
): Promise<Team | null> {
  const row = await client.selectOne<Record<string, unknown>>(
    `${TEAM_SELECT} WHERE t.id = ?`,
    [teamId]
  );
  return row ? mapTeamRow(row) : null;
}

export async function createTeam(
  client: SqlClient,
  data: { name: string; notes?: string | null }
): Promise<Team> {
  return client.transaction(async (tx) => {
    await tx.execute(
      `INSERT INTO teams (name, notes, created_at, updated_at) VALUES (?, ?, unixepoch(), unixepoch())`,
      [data.name, data.notes ?? null]
    );
    const row = await tx.selectOne<{ id: number }>(
      `SELECT id FROM teams WHERE name = ? ORDER BY id DESC LIMIT 1`,
      [data.name]
    );
    if (!row) throw new Error("Failed to create team");

    await tx.execute(
      `INSERT INTO locations (name, description, team_id, created_at, updated_at)
       VALUES ('Default Location', 'Default location for all items', ?, unixepoch(), unixepoch())`,
      [row.id]
    );

    const team = await getTeamById(tx, row.id);
    if (!team) throw new Error("Failed to load created team");
    return team;
  });
}

export async function updateTeam(
  client: SqlClient,
  teamId: number,
  data: { name?: string; notes?: string | null }
): Promise<Team | null> {
  const fields: string[] = [];
  const params: unknown[] = [];

  if (data.name !== undefined) {
    fields.push("name = ?");
    params.push(data.name);
  }
  if (data.notes !== undefined) {
    fields.push("notes = ?");
    params.push(data.notes);
  }

  if (fields.length === 0) return getTeamById(client, teamId);

  fields.push("updated_at = unixepoch()");
  params.push(teamId);

  await client.execute(
    `UPDATE teams SET ${fields.join(", ")} WHERE id = ?`,
    params
  );
  return getTeamById(client, teamId);
}

export async function deleteTeam(
  client: SqlClient,
  teamId: number
): Promise<boolean> {
  await client.execute(`DELETE FROM teams WHERE id = ?`, [teamId]);
  const row = await client.selectOne<{ id: number }>(
    `SELECT id FROM teams WHERE id = ?`,
    [teamId]
  );
  return row == null;
}
