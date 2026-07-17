import Database from "better-sqlite3";
import type { SqlClient } from "./sql-client";

type SqlRow = Record<string, unknown>;

function mapRows<T>(rows: SqlRow[]): T[] {
  return rows as T[];
}

class BetterSqliteClient implements SqlClient {
  constructor(private readonly db: Database.Database) {}

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    this.db.prepare(sql).run(...params);
  }

  async select<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const rows = this.db.prepare(sql).all(...params) as SqlRow[];
    return mapRows<T>(rows);
  }

  async selectOne<T>(
    sql: string,
    params: unknown[] = []
  ): Promise<T | undefined> {
    const row = this.db.prepare(sql).get(...params) as SqlRow | undefined;
    return row ? (row as T) : undefined;
  }

  async transaction<T>(fn: (tx: SqlClient) => Promise<T>): Promise<T> {
    await this.execute("BEGIN");
    try {
      const result = await fn(this);
      await this.execute("COMMIT");
      return result;
    } catch (error) {
      await this.execute("ROLLBACK");
      throw error;
    }
  }

  close(): void {
    this.db.close();
  }
}

export function createBetterSqliteClient(path: string): {
  client: SqlClient;
  close: () => void;
} {
  const db = new Database(path);
  db.pragma("foreign_keys = ON");
  const client = new BetterSqliteClient(db);
  return {
    client,
    close: () => client.close(),
  };
}
