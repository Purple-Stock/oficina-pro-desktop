import { describe, expect, it } from "vitest";
import * as itemsService from "../../services/items";
import * as locationsService from "../../services/locations";
import * as stockTransactionsService from "../../services/stock-transactions";
import * as teamsService from "../../services/teams";
import { createTestDatabase } from "../helpers/test-db";

describe("items, locations and stock transactions", () => {
  it("supports CRUD and stock operations against sqlite", async () => {
    const { client, close } = await createTestDatabase();

    const teamResult = await teamsService.createTeam(client, {
      name: "Ops Team",
    });
    expect(teamResult.ok).toBe(true);
    if (!teamResult.ok) throw new Error("team create failed");
    const teamId = teamResult.data.team.id;

    const locations = await locationsService.listTeamLocations(client, teamId);
    expect(locations.ok).toBe(true);
    if (!locations.ok) throw new Error("locations list failed");
    expect(locations.data.locations.length).toBeGreaterThan(0);

    const defaultLocationId = locations.data.locations[0].id;

    const newLocation = await locationsService.createTeamLocation(
      client,
      teamId,
      {
        name: "Shelf 1",
      }
    );
    expect(newLocation.ok).toBe(true);
    if (!newLocation.ok) throw new Error("location create failed");
    const shelfId = newLocation.data.location.id;

    const updatedLocation = await locationsService.updateTeamLocation(
      client,
      teamId,
      shelfId,
      { name: "Shelf A", description: "Aisle 1" }
    );
    expect(updatedLocation.ok).toBe(true);
    if (updatedLocation.ok)
      expect(updatedLocation.data.location.name).toBe("Shelf A");

    const item = await itemsService.createTeamItem(client, teamId, {
      name: "Widget",
      initialQuantity: 10,
      locationId: defaultLocationId,
    });
    expect(item.ok).toBe(true);
    if (!item.ok) throw new Error("item create failed");
    const itemId = item.data.item.id;
    expect(item.data.item.currentStock).toBe(10);

    const updatedItem = await itemsService.updateTeamItem(
      client,
      teamId,
      itemId,
      {
        name: "Widget Pro",
      }
    );
    expect(updatedItem.ok).toBe(true);
    if (updatedItem.ok) expect(updatedItem.data.item.name).toBe("Widget Pro");

    const stockIn = await stockTransactionsService.createTeamStockTransaction(
      client,
      teamId,
      {
        itemId,
        transactionType: "stock_in",
        quantity: 5,
        destinationLocationId: defaultLocationId,
      }
    );
    expect(stockIn.ok).toBe(true);

    const listedItems = await itemsService.listTeamItems(client, teamId);
    expect(listedItems.ok).toBe(true);
    if (listedItems.ok) {
      const widget = listedItems.data.items.find(
        (entry) => entry.id === itemId
      );
      expect(widget?.currentStock).toBe(15);
    }

    const stockOut = await stockTransactionsService.createTeamStockTransaction(
      client,
      teamId,
      {
        itemId,
        transactionType: "stock_out",
        quantity: 3,
      }
    );
    expect(stockOut.ok).toBe(true);

    const afterOut = await itemsService.listTeamItems(client, teamId);
    if (afterOut.ok) {
      const widget = afterOut.data.items.find((entry) => entry.id === itemId);
      expect(widget?.currentStock).toBe(12);
    }

    const adjust = await stockTransactionsService.createTeamStockTransaction(
      client,
      teamId,
      {
        itemId,
        transactionType: "adjust",
        quantity: 20,
      }
    );
    expect(adjust.ok).toBe(true);

    const afterAdjust = await itemsService.listTeamItems(client, teamId);
    if (afterAdjust.ok) {
      const widget = afterAdjust.data.items.find(
        (entry) => entry.id === itemId
      );
      expect(widget?.currentStock).toBe(20);
    }

    const move = await stockTransactionsService.createTeamStockTransaction(
      client,
      teamId,
      {
        itemId,
        transactionType: "move",
        quantity: 0,
        sourceLocationId: defaultLocationId,
        destinationLocationId: shelfId,
      }
    );
    expect(move.ok).toBe(true);
    if (move.ok) {
      expect(move.data.transaction.destinationLocationId).toBe(shelfId);
    }

    const afterMove = await itemsService.listTeamItems(client, teamId);
    if (afterMove.ok) {
      const widget = afterMove.data.items.find((entry) => entry.id === itemId);
      expect(widget?.locationId).toBe(shelfId);
    }

    const moveWithoutDestination =
      await stockTransactionsService.createTeamStockTransaction(
        client,
        teamId,
        {
          itemId,
          transactionType: "move",
          quantity: 0,
        }
      );
    expect(moveWithoutDestination.ok).toBe(false);

    const transactions = await stockTransactionsService.listTeamTransactions(
      client,
      teamId
    );
    expect(transactions.ok).toBe(true);
    if (transactions.ok) expect(transactions.data.transactions.length).toBe(4);

    const insufficient =
      await stockTransactionsService.createTeamStockTransaction(
        client,
        teamId,
        {
          itemId,
          transactionType: "stock_out",
          quantity: 999,
        }
      );
    expect(insufficient.ok).toBe(false);

    const deletedItem = await itemsService.deleteTeamItem(
      client,
      teamId,
      itemId
    );
    expect(deletedItem.ok).toBe(true);

    const deletedLocation = await locationsService.deleteTeamLocation(
      client,
      teamId,
      shelfId
    );
    expect(deletedLocation.ok).toBe(true);

    close();
  });
});
