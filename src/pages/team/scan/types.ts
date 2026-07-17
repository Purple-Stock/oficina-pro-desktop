import type { ItemDto } from "@/services/types";

export type ScanLookupItem = Pick<
  ItemDto,
  | "id"
  | "name"
  | "sku"
  | "barcode"
  | "currentStock"
  | "locationName"
  | "photoData"
  | "customFields"
>;

export function mapItemForScanLookup(item: ItemDto): ScanLookupItem {
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    barcode: item.barcode,
    currentStock: item.currentStock,
    locationName: item.locationName,
    photoData: item.photoData,
    customFields: item.customFields,
  };
}