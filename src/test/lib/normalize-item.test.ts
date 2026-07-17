import { describe, expect, it } from "vitest";
import { itemDtoToFormValues } from "@/hooks/useEditItemForm";
import { normalizeItemDto } from "@/lib/normalizeItem";

describe("normalizeItemDto", () => {
  it("parses customFields JSON string from sqlite", () => {
    const item = normalizeItemDto({
      id: 1,
      name: "Widget",
      sku: "W-1",
      barcode: "1234567890123",
      cost: 10,
      price: 20,
      itemType: "Part",
      brand: "Acme",
      photoData: null,
      initialQuantity: 5,
      currentStock: 5,
      minimumStock: 0,
      customFields: '{"color":"red"}',
      teamId: 2,
      locationId: 3,
      locationName: "Shelf",
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    });

    expect(item.customFields).toEqual({ color: "red" });
    expect(item.barcode).toBe("1234567890123");
  });
});

describe("itemDtoToFormValues", () => {
  it("maps persisted item fields into the edit form", () => {
    const form = itemDtoToFormValues({
      id: 1,
      name: "teste",
      sku: "TESTE",
      barcode: "999",
      cost: 12.5,
      price: 25,
      itemType: "Tipo",
      brand: "Marca",
      photoData: null,
      initialQuantity: 0,
      currentStock: 0,
      minimumStock: 0,
      customFields: null,
      teamId: 1,
      locationId: 1,
      locationName: "Default Location",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(form.name).toBe("teste");
    expect(form.sku).toBe("TESTE");
    expect(form.barcode).toBe("999");
    expect(form.cost).toBe("12.5");
    expect(form.price).toBe("25");
    expect(form.locationId).toBe("1");
  });
});
