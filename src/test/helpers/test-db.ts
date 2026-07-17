import { createBetterSqliteClient } from "../../db/better-sqlite-client";
import { runMigrations } from "../../db/migrate";
import type { SqlClient } from "../../db/sql-client";

export async function createTestDatabase(): Promise<{
  client: SqlClient;
  close: () => void;
}> {
  const { client, close } = createBetterSqliteClient(":memory:");
  await runMigrations(client);
  return { client, close };
}
