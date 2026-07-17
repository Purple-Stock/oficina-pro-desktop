import type {
  Client,
  Item,
  Location,
  ServiceOrder,
  ServiceOrderItem,
  StockTransaction,
  StockTransactionType,
  Team,
  Vehicle,
  WorkshopService,
} from "../db/types";

export type ServiceError = {
  code: string;
  message: string;
};

export type ServiceResult<T> =
  { ok: true; data: T } | { ok: false; error: ServiceError };

export type TeamDto = Team & { canDeleteTeam: boolean };
export type LocationDto = Location;
export type ItemDto = Item;
export type StockTransactionDto = StockTransaction;
export type ClientDto = Client;
export type VehicleDto = Vehicle;
export type WorkshopServiceDto = WorkshopService;
export type ServiceOrderDto = ServiceOrder;
export type ServiceOrderItemDto = ServiceOrderItem;

export type SavedTeamDataFile = {
  filePath: string;
  fileName: string;
  directory: string;
};

export type ItemCsvImportPreviewRow = {
  line: number;
  status: "valid" | "invalid";
  item: Record<string, unknown> | null;
  errors: string[];
};

export type ItemCsvImportPreview = {
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  };
  rows: ItemCsvImportPreviewRow[];
};

export type TeamBackupImportSummary = {
  importedLocations: number;
  skippedLocations: number;
  importedItems: number;
  skippedItems: number;
  updatedTeamSettings: boolean;
};

export type ReportStatsDto = {
  totalItems: number;
  totalLocations: number;
  totalTransactions: number;
  totalStockValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  transactionsByType: {
    stock_in: number;
    stock_out: number;
    adjust: number;
    move: number;
  };
  recentTransactions: Array<{
    id: number;
    transactionType: StockTransactionType;
    quantity: number;
    createdAt: number;
    itemName: string | null;
  }>;
  topItemsByValue: Array<{
    id: number;
    name: string | null;
    sku: string | null;
    currentStock: number | null;
    price: number | null;
    totalValue: number;
  }>;
  stockByLocation: Array<{
    locationId: number | null;
    locationName: string | null;
    itemCount: number;
    totalStock: number;
    totalValue: number;
  }>;
  transactionsByDate: Array<{
    date: string;
    stock_in: number;
    stock_out: number;
    adjust: number;
    move: number;
  }>;
};
