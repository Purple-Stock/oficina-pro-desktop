import type { ItemDto, LocationDto, TeamDto } from "@/services/types";

export type StockInItem = Pick<
  ItemDto,
  "id" | "name" | "sku" | "barcode" | "currentStock" | "locationName"
>;

export type StockInLocation = Pick<LocationDto, "id" | "name">;

export type StockInTeam = TeamDto;

export interface SelectedStockInItem {
  item: StockInItem;
  quantity: number;
}
