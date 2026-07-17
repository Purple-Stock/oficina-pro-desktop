import { describe, expect, it } from "vitest";
import * as teamsService from "../../services/teams";
import { createTestDatabase } from "../helpers/test-db";

describe("teams service", () => {
  it("lists, creates, updates and deletes teams without auth", async () => {
    const { client, close } = await createTestDatabase();

    const empty = await teamsService.listTeams(client);
    expect(empty.ok).toBe(true);
    if (empty.ok) expect(empty.data.teams).toHaveLength(0);

    const created = await teamsService.createTeam(client, {
      name: "Warehouse A",
      notes: "Main warehouse",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error("create failed");

    const teamId = created.data.team.id;
    expect(created.data.team.name).toBe("Warehouse A");
    expect(created.data.team.itemCount).toBe(0);

    const listed = await teamsService.listTeams(client);
    expect(listed.ok).toBe(true);
    if (listed.ok) expect(listed.data.teams).toHaveLength(1);

    const updated = await teamsService.updateTeam(client, teamId, {
      name: "Warehouse B",
    });
    expect(updated.ok).toBe(true);
    if (updated.ok) expect(updated.data.team.name).toBe("Warehouse B");

    const deleted = await teamsService.deleteTeam(client, teamId);
    expect(deleted.ok).toBe(true);

    const afterDelete = await teamsService.listTeams(client);
    expect(afterDelete.ok).toBe(true);
    if (afterDelete.ok) expect(afterDelete.data.teams).toHaveLength(0);

    close();
  });

  it("rejects empty team name", async () => {
    const { client, close } = await createTestDatabase();
    const result = await teamsService.createTeam(client, { name: "  " });
    expect(result.ok).toBe(false);
    close();
  });
});
