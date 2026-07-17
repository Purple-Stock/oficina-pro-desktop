import * as serviceOrdersRepo from "../db/repos/service-orders";
import * as teamsRepo from "../db/repos/teams";
import type { SqlClient } from "../db/sql-client";
import type {
  PaymentStatus,
  ServiceOrderItemKind,
  ServiceOrderStatus,
} from "../db/types";
import { internalError, notFoundError, validationError } from "./errors";
import type {
  ServiceOrderDto,
  ServiceOrderItemDto,
  ServiceResult,
} from "./types";

export async function listTeamServiceOrders(
  client: SqlClient,
  teamId: number
): Promise<ServiceResult<{ serviceOrders: ServiceOrderDto[] }>> {
  const team = await teamsRepo.getTeamById(client, teamId);
  if (!team) return { ok: false, error: notFoundError("Team not found") };
  try {
    const serviceOrders = await serviceOrdersRepo.listTeamServiceOrders(
      client,
      teamId
    );
    return { ok: true, data: { serviceOrders } };
  } catch {
    return {
      ok: false,
      error: internalError("Failed to list service orders"),
    };
  }
}

export async function getTeamServiceOrder(
  client: SqlClient,
  teamId: number,
  orderId: number
): Promise<ServiceResult<{ serviceOrder: ServiceOrderDto }>> {
  try {
    const serviceOrder = await serviceOrdersRepo.getServiceOrderById(
      client,
      orderId,
      teamId
    );
    if (!serviceOrder)
      return { ok: false, error: notFoundError("Service order not found") };
    return { ok: true, data: { serviceOrder } };
  } catch {
    return {
      ok: false,
      error: internalError("Failed to load service order"),
    };
  }
}

export async function createTeamServiceOrder(
  client: SqlClient,
  teamId: number,
  payload: {
    clientId?: number | null;
    vehicleId?: number | null;
    status?: ServiceOrderStatus;
    paymentStatus?: PaymentStatus;
    odometer?: number | null;
    complaint?: string | null;
    diagnosis?: string | null;
    notes?: string | null;
    discount?: number;
  }
): Promise<ServiceResult<{ serviceOrder: ServiceOrderDto }>> {
  const team = await teamsRepo.getTeamById(client, teamId);
  if (!team) return { ok: false, error: notFoundError("Team not found") };
  try {
    const serviceOrder = await serviceOrdersRepo.createServiceOrder(client, {
      teamId,
      ...payload,
    });
    return { ok: true, data: { serviceOrder } };
  } catch {
    return {
      ok: false,
      error: internalError("Failed to create service order"),
    };
  }
}

export async function updateTeamServiceOrder(
  client: SqlClient,
  teamId: number,
  orderId: number,
  payload: Partial<{
    clientId: number | null;
    vehicleId: number | null;
    status: ServiceOrderStatus;
    paymentStatus: PaymentStatus;
    odometer: number | null;
    complaint: string | null;
    diagnosis: string | null;
    notes: string | null;
    discount: number;
  }>
): Promise<ServiceResult<{ serviceOrder: ServiceOrderDto }>> {
  try {
    const serviceOrder = await serviceOrdersRepo.updateServiceOrder(
      client,
      orderId,
      teamId,
      payload
    );
    if (!serviceOrder)
      return { ok: false, error: notFoundError("Service order not found") };
    return { ok: true, data: { serviceOrder } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Insufficient stock")) {
      return { ok: false, error: validationError(message) };
    }
    if (message.includes("reopened") || message.includes("closed")) {
      return { ok: false, error: validationError(message) };
    }
    return {
      ok: false,
      error: internalError("Failed to update service order"),
    };
  }
}

export async function addTeamServiceOrderItem(
  client: SqlClient,
  teamId: number,
  orderId: number,
  payload: {
    kind?: ServiceOrderItemKind;
    refId?: number | null;
    description?: string;
    quantity?: number;
    unitPrice?: number;
  }
): Promise<ServiceResult<{ item: ServiceOrderItemDto }>> {
  const kind = payload.kind;
  const description = payload.description?.trim();
  if (!kind || (kind !== "part" && kind !== "service")) {
    return {
      ok: false,
      error: validationError("Item kind must be part or service"),
    };
  }
  if (!description) {
    return {
      ok: false,
      error: validationError("Item description is required"),
    };
  }
  try {
    const item = await serviceOrdersRepo.addServiceOrderItem(
      client,
      orderId,
      teamId,
      {
        kind,
        refId: payload.refId,
        description,
        quantity: payload.quantity ?? 1,
        unitPrice: payload.unitPrice ?? 0,
      }
    );
    return { ok: true, data: { item } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("closed") || message.includes("not found")) {
      return { ok: false, error: validationError(message) };
    }
    return {
      ok: false,
      error: internalError("Failed to add service order item"),
    };
  }
}

export async function removeTeamServiceOrderItem(
  client: SqlClient,
  teamId: number,
  orderId: number,
  itemId: number
): Promise<ServiceResult<null>> {
  try {
    const ok = await serviceOrdersRepo.removeServiceOrderItem(
      client,
      orderId,
      teamId,
      itemId
    );
    if (!ok) return { ok: false, error: notFoundError("Line item not found") };
    return { ok: true, data: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("closed")) {
      return { ok: false, error: validationError(message) };
    }
    return {
      ok: false,
      error: internalError("Failed to remove service order item"),
    };
  }
}

export async function deleteTeamServiceOrder(
  client: SqlClient,
  teamId: number,
  orderId: number
): Promise<ServiceResult<null>> {
  try {
    const ok = await serviceOrdersRepo.deleteServiceOrder(
      client,
      orderId,
      teamId
    );
    if (!ok)
      return { ok: false, error: notFoundError("Service order not found") };
    return { ok: true, data: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("stock")) {
      return { ok: false, error: validationError(message) };
    }
    return {
      ok: false,
      error: internalError("Failed to delete service order"),
    };
  }
}
