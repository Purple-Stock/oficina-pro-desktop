import type { ItemCustomFields } from "@/db/types";
import type { ItemDto } from "@/services/types";

function parseCustomFields(value: unknown): ItemCustomFields | null {
  if (value == null || value === "") return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as ItemCustomFields;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as ItemCustomFields;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") return new Date(value);
  return new Date();
}

export function normalizeItemDto(raw: Record<string, unknown>): ItemDto {
  return {
    id: Number(raw.id),
    name: raw.name == null ? null : String(raw.name),
    sku: raw.sku == null ? null : String(raw.sku),
    barcode: raw.barcode == null ? null : String(raw.barcode),
    cost: raw.cost == null ? null : Number(raw.cost),
    price: raw.price == null ? null : Number(raw.price),
    itemType: raw.itemType == null ? null : String(raw.itemType),
    brand: raw.brand == null ? null : String(raw.brand),
    photoData: raw.photoData == null ? null : String(raw.photoData),
    initialQuantity: Number(raw.initialQuantity ?? 0),
    currentStock: Number(raw.currentStock ?? 0),
    minimumStock: Number(raw.minimumStock ?? 0),
    customFields: parseCustomFields(raw.customFields),
    teamId: Number(raw.teamId),
    locationId: raw.locationId == null ? null : Number(raw.locationId),
    locationName: raw.locationName == null ? null : String(raw.locationName),
    createdAt: toDate(raw.createdAt),
    updatedAt: toDate(raw.updatedAt),
  };
}
