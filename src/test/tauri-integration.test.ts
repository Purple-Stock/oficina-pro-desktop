import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("tauri production persistence", () => {
  it("runs rust sqlite integration tests against the shipped db module", () => {
    const manifestPath = resolve(process.cwd(), "src-tauri/Cargo.toml");
    const output = execSync(
      `cargo test --manifest-path "${manifestPath}" --release production_sqlite_supports_team_item_location_crud_and_move -- --nocapture`,
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    expect(output).toContain(
      "production_sqlite_supports_team_item_location_crud_and_move"
    );
    expect(output).toContain("test result: ok");
  }, 600_000);
});
