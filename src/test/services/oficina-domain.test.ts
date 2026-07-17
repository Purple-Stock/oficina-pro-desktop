import { afterEach, describe, expect, it } from "vitest";
import * as clientsService from "../../services/clients";
import * as serviceOrdersService from "../../services/service-orders";
import * as vehiclesService from "../../services/vehicles";
import * as workshopServices from "../../services/workshop-services";
import * as itemsService from "../../services/items";
import * as teamsService from "../../services/teams";
import { createTestDatabase } from "../helpers/test-db";

describe("oficina domain", () => {
  let closeDb: (() => void) | null = null;

  afterEach(() => {
    closeDb?.();
    closeDb = null;
  });

  it("creates client, vehicle, service order with part debit on close", async () => {
    const { client, close } = await createTestDatabase();
    closeDb = close;

    const teamResult = await teamsService.createTeam(client, {
      name: "Oficina Teste",
    });
    expect(teamResult.ok).toBe(true);
    if (!teamResult.ok) return;
    const teamId = teamResult.data.team.id;

    const clientResult = await clientsService.createTeamClient(client, teamId, {
      name: "João Silva",
      phone: "11999999999",
    });
    expect(clientResult.ok).toBe(true);
    if (!clientResult.ok) return;

    const vehicleResult = await vehiclesService.createTeamVehicle(
      client,
      teamId,
      {
        clientId: clientResult.data.client.id,
        plate: "abc1d23",
        brand: "VW",
        model: "Gol",
        year: 2018,
      }
    );
    expect(vehicleResult.ok).toBe(true);
    if (!vehicleResult.ok) return;
    expect(vehicleResult.data.vehicle.plate).toBe("ABC1D23");

    const serviceResult = await workshopServices.createTeamWorkshopService(
      client,
      teamId,
      {
        name: "Troca de óleo",
        price: 100,
        estimatedMinutes: 40,
      }
    );
    expect(serviceResult.ok).toBe(true);
    if (!serviceResult.ok) return;

    const partResult = await itemsService.createTeamItem(client, teamId, {
      name: "Filtro de óleo",
      price: 35,
      initialQuantity: 10,
    });
    expect(partResult.ok).toBe(true);
    if (!partResult.ok) return;

    const orderResult = await serviceOrdersService.createTeamServiceOrder(
      client,
      teamId,
      {
        clientId: clientResult.data.client.id,
        vehicleId: vehicleResult.data.vehicle.id,
        complaint: "Motor ruidoso",
      }
    );
    expect(orderResult.ok).toBe(true);
    if (!orderResult.ok) return;
    const orderId = orderResult.data.serviceOrder.id;

    const laborLine = await serviceOrdersService.addTeamServiceOrderItem(
      client,
      teamId,
      orderId,
      {
        kind: "service",
        refId: serviceResult.data.service.id,
        description: serviceResult.data.service.name,
        quantity: 1,
        unitPrice: 100,
      }
    );
    expect(laborLine.ok).toBe(true);

    const partLine = await serviceOrdersService.addTeamServiceOrderItem(
      client,
      teamId,
      orderId,
      {
        kind: "part",
        refId: partResult.data.item.id,
        description: "Filtro de óleo",
        quantity: 2,
        unitPrice: 35,
      }
    );
    expect(partLine.ok).toBe(true);

    const beforeClose = await serviceOrdersService.getTeamServiceOrder(
      client,
      teamId,
      orderId
    );
    expect(beforeClose.ok).toBe(true);
    if (!beforeClose.ok) return;
    expect(beforeClose.data.serviceOrder.laborTotal).toBe(100);
    expect(beforeClose.data.serviceOrder.partsTotal).toBe(70);
    expect(beforeClose.data.serviceOrder.total).toBe(170);

    const closed = await serviceOrdersService.updateTeamServiceOrder(
      client,
      teamId,
      orderId,
      { status: "closed" }
    );
    expect(closed.ok).toBe(true);
    if (!closed.ok) return;
    expect(closed.data.serviceOrder.status).toBe("closed");
    expect(closed.data.serviceOrder.stockDebited).toBe(true);

    const itemsAfter = await itemsService.listTeamItems(client, teamId);
    expect(itemsAfter.ok).toBe(true);
    if (!itemsAfter.ok) return;
    const partAfter = itemsAfter.data.items.find(
      (item) => item.id === partResult.data.item.id
    );
    expect(partAfter?.currentStock).toBe(8);
  });
});
