import type { ItemDto, LocationDto, TeamDto } from "@/services/types";

export type StockOperationItem = Pick<
  ItemDto,
  "id" | "name" | "sku" | "barcode" | "currentStock" | "locationName"
>;

export type StockOperationLocation = Pick<LocationDto, "id" | "name">;

export type StockOperationTeam = TeamDto;

export interface SelectedQuantityItem {
  item: StockOperationItem;
  quantity: number;
}

export interface SelectedAdjustItem {
  item: StockOperationItem;
  newStock: number;
}

export function mapItemForStockOperation(item: ItemDto): StockOperationItem {
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    barcode: item.barcode,
    currentStock: item.currentStock,
    locationName: item.locationName,
  };
}

export function mapLocationForStockOperation(
  location: LocationDto
): StockOperationLocation {
  return {
    id: location.id,
    name: location.name,
  };
}
