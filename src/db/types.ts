export type StockTransactionType =
  "stock_in" | "stock_out" | "adjust" | "move" | "count";

export type TeamItemCustomFieldSchemaEntry = {
  key: string;
  label: string;
  active: boolean;
};

export type ItemCustomFields = Record<string, string>;

export type Team = {
  id: number;
  name: string;
  notes: string | null;
  labelCompanyInfo: string | null;
  labelLogoUrl: string | null;
  itemCustomFieldSchema: TeamItemCustomFieldSchemaEntry[] | null;
  createdAt: Date;
  updatedAt: Date;
  itemCount?: number;
  transactionCount?: number;
};

export type Location = {
  id: number;
  name: string;
  description: string | null;
  teamId: number;
  createdAt: Date;
  updatedAt: Date;
};

export type Item = {
  id: number;
  name: string | null;
  sku: string | null;
  barcode: string | null;
  cost: number | null;
  price: number | null;
  itemType: string | null;
  brand: string | null;
  photoData: string | null;
  initialQuantity: number;
  currentStock: number;
  minimumStock: number;
  customFields: ItemCustomFields | null;
  teamId: number;
  locationId: number | null;
  locationName?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StockTransaction = {
  id: number;
  itemId: number;
  teamId: number;
  transactionType: StockTransactionType;
  quantity: number;
  notes: string | null;
  sourceLocationId: number | null;
  destinationLocationId: number | null;
  destinationKind: string | null;
  destinationLabel: string | null;
  createdAt: Date;
  updatedAt: Date;
  itemName?: string | null;
};

export type ServiceOrderStatus =
  "open" | "in_progress" | "waiting_parts" | "done" | "closed" | "cancelled";

export type PaymentStatus = "pending" | "partial" | "paid";

export type ServiceOrderItemKind = "part" | "service";

export type Client = {
  id: number;
  teamId: number;
  name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  vehicleCount?: number;
};

export type Vehicle = {
  id: number;
  teamId: number;
  clientId: number;
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  odometer: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  clientName?: string | null;
};

export type WorkshopService = {
  id: number;
  teamId: number;
  name: string;
  description: string | null;
  price: number;
  estimatedMinutes: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ServiceOrderItem = {
  id: number;
  serviceOrderId: number;
  kind: ServiceOrderItemKind;
  refId: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ServiceOrder = {
  id: number;
  teamId: number;
  clientId: number | null;
  vehicleId: number | null;
  status: ServiceOrderStatus;
  paymentStatus: PaymentStatus;
  odometer: number | null;
  complaint: string | null;
  diagnosis: string | null;
  notes: string | null;
  discount: number;
  laborTotal: number;
  partsTotal: number;
  total: number;
  stockDebited: boolean;
  openedAt: Date;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  clientName?: string | null;
  vehiclePlate?: string | null;
  vehicleLabel?: string | null;
  items?: ServiceOrderItem[];
};
