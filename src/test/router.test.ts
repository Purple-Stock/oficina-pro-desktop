import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("desktop router", () => {
  it("starts at team selection without login or billing routes", () => {
    const source = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");

    expect(source).toContain('path="/" element={<TeamSelectionPage />}');
    expect(source).not.toMatch(/path="\/login"/);
    expect(source).not.toMatch(/path="\/signup"/);
    expect(source).not.toMatch(/billing/i);
    expect(source).not.toContain("hasActiveTeamSubscription");
  });
});
