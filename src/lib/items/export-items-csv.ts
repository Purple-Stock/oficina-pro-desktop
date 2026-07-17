import type { ItemDto } from "@/services/types";

export const ITEMS_CSV_TEMPLATE_HEADERS = [
  "Name",
  "SKU",
  "Barcode",
  "Type",
  "Stock",
  "Price",
  "Location",
] as const;

function escapeCsvField(value: string | number | null | undefined): string {
  if (value == null) return "";
  const stringValue = String(value);
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

export function itemsToCsv(
  items: ItemDto[],
  headers: {
    name: string;
    sku: string;
    barcode: string;
    type: string;
    stock: string;
    price: string;
    location: string;
  }
): string {
  const rows: string[] = [
    [
      escapeCsvField(headers.name),
      escapeCsvField(headers.sku),
      escapeCsvField(headers.barcode),
      escapeCsvField(headers.type),
      escapeCsvField(headers.stock),
      escapeCsvField(headers.price),
      escapeCsvField(headers.location),
    ].join(","),
  ];

  for (const item of items) {
    rows.push(
      [
        escapeCsvField(item.name),
        escapeCsvField(item.sku),
        escapeCsvField(item.barcode),
        escapeCsvField(item.itemType),
        escapeCsvField(item.currentStock ?? ""),
        item.price != null ? escapeCsvField(item.price) : "",
        escapeCsvField(item.locationName ?? ""),
      ].join(",")
    );
  }

  return rows.join("\n");
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export function getItemsCsvTemplate(): string {
  return ITEMS_CSV_TEMPLATE_HEADERS.join(",");
}