import { invoke } from "@tauri-apps/api/core";
import type {
  ClientDto,
  ItemCsvImportPreview,
  ItemDto,
  LocationDto,
  ReportStatsDto,
  SavedTeamDataFile,
  ServiceOrderDto,
  ServiceOrderItemDto,
  ServiceResult,
  StockTransactionDto,
  TeamBackupImportSummary,
  TeamDto,
  VehicleDto,
  WorkshopServiceDto,
} from "../services/types";

type InvokeResult<T> = ServiceResult<T>;

export async function listTeams(): Promise<InvokeResult<{ teams: TeamDto[] }>> {
  return invoke("list_teams");
}

export async function getTeam(
  teamId: number
): Promise<InvokeResult<{ team: TeamDto }>> {
  return invoke("get_team", { teamId });
}

export async function createTeam(payload: {
  name: string;
  notes?: string | null;
}): Promise<InvokeResult<{ team: TeamDto }>> {
  return invoke("create_team", { payload });
}

export async function updateTeam(
  teamId: number,
  payload: {
    name?: string;
    notes?: string | null;
    labelCompanyInfo?: string | null;
    labelLogoUrl?: string | null;
    itemCustomFieldSchema?: TeamDto["itemCustomFieldSchema"];
  }
): Promise<InvokeResult<{ team: TeamDto }>> {
  return invoke("update_team", { teamId, payload });
}

export async function deleteTeam(teamId: number): Promise<InvokeResult<null>> {
  return invoke("delete_team", { teamId });
}

export async function listTeamItems(
  teamId: number
): Promise<InvokeResult<{ items: ItemDto[] }>> {
  return invoke("list_team_items", { teamId });
}

export async function getTeamItem(
  teamId: number,
  itemId: number
): Promise<InvokeResult<{ item: ItemDto }>> {
  return invoke("get_team_item", { teamId, itemId });
}

export async function createTeamItem(
  teamId: number,
  payload: Record<string, unknown>
): Promise<InvokeResult<{ item: ItemDto }>> {
  return invoke("create_team_item", { teamId, payload });
}

export async function updateTeamItem(
  teamId: number,
  itemId: number,
  payload: Record<string, unknown>
): Promise<InvokeResult<{ item: ItemDto }>> {
  return invoke("update_team_item", { teamId, itemId, payload });
}

export async function deleteTeamItem(
  teamId: number,
  itemId: number
): Promise<InvokeResult<null>> {
  return invoke("delete_team_item", { teamId, itemId });
}

export async function listTeamLocations(
  teamId: number
): Promise<InvokeResult<{ locations: LocationDto[] }>> {
  return invoke("list_team_locations", { teamId });
}

export async function createTeamLocation(
  teamId: number,
  payload: { name?: string; description?: string | null }
): Promise<InvokeResult<{ location: LocationDto }>> {
  return invoke("create_team_location", { teamId, payload });
}

export async function updateTeamLocation(
  teamId: number,
  locationId: number,
  payload: { name?: string; description?: string | null }
): Promise<InvokeResult<{ location: LocationDto }>> {
  return invoke("update_team_location", { teamId, locationId, payload });
}

export async function deleteTeamLocation(
  teamId: number,
  locationId: number
): Promise<InvokeResult<null>> {
  return invoke("delete_team_location", { teamId, locationId });
}

export async function listTeamTransactions(
  teamId: number
): Promise<InvokeResult<{ transactions: StockTransactionDto[] }>> {
  return invoke("list_team_transactions", { teamId });
}

export async function getTeamReportStats(
  teamId: number,
  options?: { startDate?: string; endDate?: string }
): Promise<InvokeResult<{ stats: ReportStatsDto }>> {
  return invoke("get_team_report_stats", {
    teamId,
    startDate: options?.startDate ?? null,
    endDate: options?.endDate ?? null,
  });
}

export async function createTeamStockTransaction(
  teamId: number,
  payload: Record<string, unknown>
): Promise<InvokeResult<{ transaction: StockTransactionDto }>> {
  return invoke("create_team_stock_transaction", { teamId, payload });
}

export async function exportFullBackup(
  filename: string
): Promise<InvokeResult<SavedTeamDataFile>> {
  return invoke("export_full_backup", { filename });
}

export async function deleteAllData(): Promise<
  InvokeResult<{ deletedTeams: number }>
> {
  return invoke("delete_all_data");
}

export async function importTeamBackup(
  teamId: number,
  jsonContent: string
): Promise<InvokeResult<TeamBackupImportSummary>> {
  return invoke("import_team_backup", { teamId, jsonContent });
}

export async function previewTeamItemsCsv(
  teamId: number,
  csvContent: string
): Promise<InvokeResult<ItemCsvImportPreview>> {
  return invoke("preview_team_items_csv", { teamId, csvContent });
}

export async function importTeamItemsCsv(
  teamId: number,
  csvContent: string
): Promise<
  InvokeResult<{
    summary: { totalRows: number; importedRows: number; rejectedRows: number };
  }>
> {
  return invoke("import_team_items_csv", { teamId, csvContent });
}

export async function initDatabase(): Promise<void> {
  return invoke("init_database");
}

export async function listTeamClients(
  teamId: number
): Promise<InvokeResult<{ clients: ClientDto[] }>> {
  return invoke("list_team_clients", { teamId });
}

export async function createTeamClient(
  teamId: number,
  payload: Record<string, unknown>
): Promise<InvokeResult<{ client: ClientDto }>> {
  return invoke("create_team_client", { teamId, payload });
}

export async function updateTeamClient(
  teamId: number,
  clientId: number,
  payload: Record<string, unknown>
): Promise<InvokeResult<{ client: ClientDto }>> {
  return invoke("update_team_client", { teamId, clientId, payload });
}

export async function deleteTeamClient(
  teamId: number,
  clientId: number
): Promise<InvokeResult<null>> {
  return invoke("delete_team_client", { teamId, clientId });
}

export async function listTeamVehicles(
  teamId: number
): Promise<InvokeResult<{ vehicles: VehicleDto[] }>> {
  return invoke("list_team_vehicles", { teamId });
}

export async function createTeamVehicle(
  teamId: number,
  payload: Record<string, unknown>
): Promise<InvokeResult<{ vehicle: VehicleDto }>> {
  return invoke("create_team_vehicle", { teamId, payload });
}

export async function updateTeamVehicle(
  teamId: number,
  vehicleId: number,
  payload: Record<string, unknown>
): Promise<InvokeResult<{ vehicle: VehicleDto }>> {
  return invoke("update_team_vehicle", { teamId, vehicleId, payload });
}

export async function deleteTeamVehicle(
  teamId: number,
  vehicleId: number
): Promise<InvokeResult<null>> {
  return invoke("delete_team_vehicle", { teamId, vehicleId });
}

export async function listTeamWorkshopServices(
  teamId: number
): Promise<InvokeResult<{ services: WorkshopServiceDto[] }>> {
  return invoke("list_team_workshop_services", { teamId });
}

export async function createTeamWorkshopService(
  teamId: number,
  payload: Record<string, unknown>
): Promise<InvokeResult<{ service: WorkshopServiceDto }>> {
  return invoke("create_team_workshop_service", { teamId, payload });
}

export async function updateTeamWorkshopService(
  teamId: number,
  serviceId: number,
  payload: Record<string, unknown>
): Promise<InvokeResult<{ service: WorkshopServiceDto }>> {
  return invoke("update_team_workshop_service", { teamId, serviceId, payload });
}

export async function deleteTeamWorkshopService(
  teamId: number,
  serviceId: number
): Promise<InvokeResult<null>> {
  return invoke("delete_team_workshop_service", { teamId, serviceId });
}

export async function listTeamServiceOrders(
  teamId: number
): Promise<InvokeResult<{ serviceOrders: ServiceOrderDto[] }>> {
  return invoke("list_team_service_orders", { teamId });
}

export async function getTeamServiceOrder(
  teamId: number,
  orderId: number
): Promise<InvokeResult<{ serviceOrder: ServiceOrderDto }>> {
  return invoke("get_team_service_order", { teamId, orderId });
}

export async function createTeamServiceOrder(
  teamId: number,
  payload: Record<string, unknown>
): Promise<InvokeResult<{ serviceOrder: ServiceOrderDto }>> {
  return invoke("create_team_service_order", { teamId, payload });
}

export async function updateTeamServiceOrder(
  teamId: number,
  orderId: number,
  payload: Record<string, unknown>
): Promise<InvokeResult<{ serviceOrder: ServiceOrderDto }>> {
  return invoke("update_team_service_order", { teamId, orderId, payload });
}

export async function addTeamServiceOrderItem(
  teamId: number,
  orderId: number,
  payload: Record<string, unknown>
): Promise<InvokeResult<{ item: ServiceOrderItemDto }>> {
  return invoke("add_team_service_order_item", { teamId, orderId, payload });
}

export async function removeTeamServiceOrderItem(
  teamId: number,
  orderId: number,
  itemId: number
): Promise<InvokeResult<null>> {
  return invoke("remove_team_service_order_item", {
    teamId,
    orderId,
    itemId,
  });
}

export async function deleteTeamServiceOrder(
  teamId: number,
  orderId: number
): Promise<InvokeResult<null>> {
  return invoke("delete_team_service_order", { teamId, orderId });
}
