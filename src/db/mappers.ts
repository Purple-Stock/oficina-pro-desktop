import type {
  Client,
  Item,
  ItemCustomFields,
  Location,
  PaymentStatus,
  ServiceOrder,
  ServiceOrderItem,
  ServiceOrderItemKind,
  ServiceOrderStatus,
  StockTransaction,
  StockTransactionType,
  Team,
  TeamItemCustomFieldSchemaEntry,
  Vehicle,
  WorkshopService,
} from "./types";

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value * 1000);
  if (typeof value === "string") return new Date(value);
  return new Date();
}

function parseJson<T>(value: unknown): T | null {
  if (value == null || value === "") return null;
  if (typeof value === "object") return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return null;
  }
}

export function mapTeamRow(row: Record<string, unknown>): Team {
  return {
    id: Number(row.id),
    name: String(row.name),
    notes: row.notes == null ? null : String(row.notes),
    labelCompanyInfo:
      row.label_company_info == null ? null : String(row.label_company_info),
    labelLogoUrl:
      row.label_logo_url == null ? null : String(row.label_logo_url),
    itemCustomFieldSchema: parseJson<TeamItemCustomFieldSchemaEntry[]>(
      row.item_custom_field_schema
    ),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
    itemCount: row.item_count == null ? undefined : Number(row.item_count),
    transactionCount:
      row.transaction_count == null ? undefined : Number(row.transaction_count),
  };
}

export function mapLocationRow(row: Record<string, unknown>): Location {
  return {
    id: Number(row.id),
    name: String(row.name),
    description: row.description == null ? null : String(row.description),
    teamId: Number(row.team_id),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}

export function mapItemRow(row: Record<string, unknown>): Item {
  return {
    id: Number(row.id),
    name: row.name == null ? null : String(row.name),
    sku: row.sku == null ? null : String(row.sku),
    barcode: row.barcode == null ? null : String(row.barcode),
    cost: row.cost == null ? null : Number(row.cost),
    price: row.price == null ? null : Number(row.price),
    itemType: row.item_type == null ? null : String(row.item_type),
    brand: row.brand == null ? null : String(row.brand),
    photoData: row.photo_data == null ? null : String(row.photo_data),
    initialQuantity: Number(row.initial_quantity ?? 0),
    currentStock: Number(row.current_stock ?? 0),
    minimumStock: Number(row.minimum_stock ?? 0),
    customFields: parseJson<ItemCustomFields>(row.custom_fields),
    teamId: Number(row.team_id),
    locationId: row.location_id == null ? null : Number(row.location_id),
    locationName: row.location_name == null ? null : String(row.location_name),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}

export function mapStockTransactionRow(
  row: Record<string, unknown>
): StockTransaction {
  return {
    id: Number(row.id),
    itemId: Number(row.item_id),
    teamId: Number(row.team_id),
    transactionType: String(row.transaction_type) as StockTransactionType,
    quantity: Number(row.quantity),
    notes: row.notes == null ? null : String(row.notes),
    sourceLocationId:
      row.source_location_id == null ? null : Number(row.source_location_id),
    destinationLocationId:
      row.destination_location_id == null
        ? null
        : Number(row.destination_location_id),
    destinationKind:
      row.destination_kind == null ? null : String(row.destination_kind),
    destinationLabel:
      row.destination_label == null ? null : String(row.destination_label),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
    itemName: row.item_name == null ? null : String(row.item_name),
  };
}

export function mapClientRow(row: Record<string, unknown>): Client {
  return {
    id: Number(row.id),
    teamId: Number(row.team_id),
    name: String(row.name),
    phone: row.phone == null ? null : String(row.phone),
    email: row.email == null ? null : String(row.email),
    document: row.document == null ? null : String(row.document),
    notes: row.notes == null ? null : String(row.notes),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
    vehicleCount:
      row.vehicle_count == null ? undefined : Number(row.vehicle_count),
  };
}

export function mapVehicleRow(row: Record<string, unknown>): Vehicle {
  return {
    id: Number(row.id),
    teamId: Number(row.team_id),
    clientId: Number(row.client_id),
    plate: String(row.plate),
    brand: row.brand == null ? null : String(row.brand),
    model: row.model == null ? null : String(row.model),
    year: row.year == null ? null : Number(row.year),
    color: row.color == null ? null : String(row.color),
    odometer: row.odometer == null ? null : Number(row.odometer),
    notes: row.notes == null ? null : String(row.notes),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
    clientName: row.client_name == null ? null : String(row.client_name),
  };
}

export function mapWorkshopServiceRow(
  row: Record<string, unknown>
): WorkshopService {
  return {
    id: Number(row.id),
    teamId: Number(row.team_id),
    name: String(row.name),
    description: row.description == null ? null : String(row.description),
    price: Number(row.price ?? 0),
    estimatedMinutes: Number(row.estimated_minutes ?? 0),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}

export function mapServiceOrderItemRow(
  row: Record<string, unknown>
): ServiceOrderItem {
  return {
    id: Number(row.id),
    serviceOrderId: Number(row.service_order_id),
    kind: String(row.kind) as ServiceOrderItemKind,
    refId: row.ref_id == null ? null : Number(row.ref_id),
    description: String(row.description),
    quantity: Number(row.quantity ?? 1),
    unitPrice: Number(row.unit_price ?? 0),
    lineTotal: Number(row.line_total ?? 0),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
  };
}

export function mapServiceOrderRow(row: Record<string, unknown>): ServiceOrder {
  return {
    id: Number(row.id),
    teamId: Number(row.team_id),
    clientId: row.client_id == null ? null : Number(row.client_id),
    vehicleId: row.vehicle_id == null ? null : Number(row.vehicle_id),
    status: String(row.status ?? "open") as ServiceOrderStatus,
    paymentStatus: String(row.payment_status ?? "pending") as PaymentStatus,
    odometer: row.odometer == null ? null : Number(row.odometer),
    complaint: row.complaint == null ? null : String(row.complaint),
    diagnosis: row.diagnosis == null ? null : String(row.diagnosis),
    notes: row.notes == null ? null : String(row.notes),
    discount: Number(row.discount ?? 0),
    laborTotal: Number(row.labor_total ?? 0),
    partsTotal: Number(row.parts_total ?? 0),
    total: Number(row.total ?? 0),
    stockDebited: Boolean(Number(row.stock_debited ?? 0)),
    openedAt: toDate(row.opened_at ?? row.created_at),
    closedAt: row.closed_at == null ? null : toDate(row.closed_at),
    createdAt: toDate(row.created_at),
    updatedAt: toDate(row.updated_at),
    clientName: row.client_name == null ? null : String(row.client_name),
    vehiclePlate: row.vehicle_plate == null ? null : String(row.vehicle_plate),
    vehicleLabel: row.vehicle_label == null ? null : String(row.vehicle_label),
  };
}
