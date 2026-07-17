import { describe, expect, it } from "vitest";
import { createTestDatabase } from "./helpers/test-db";

describe("database migrations", () => {
  it("creates teams, locations, items and stock_transactions tables", async () => {
    const { client, close } = await createTestDatabase();

    const tables = await client.select<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`
    );

    expect(tables.map((table) => table.name)).toEqual(
      expect.arrayContaining([
        "teams",
        "locations",
        "items",
        "stock_transactions",
      ])
    );

    close();
  });
});
