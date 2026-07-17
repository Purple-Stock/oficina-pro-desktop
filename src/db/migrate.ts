import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { SqlClient } from "./sql-client";

const migrationDir = dirname(fileURLToPath(import.meta.url));

export async function runMigrations(client: SqlClient): Promise<void> {
  const sql = readFileSync(
    join(migrationDir, "migrations", "001_init.sql"),
    "utf8"
  );
  const statements = sql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  for (const statement of statements) {
    await client.execute(statement);
  }
}
