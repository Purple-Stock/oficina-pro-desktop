import { useEffect, useState } from "react";
import * as api from "@/api/desktop-api";
import type { ItemFormValues } from "@/components/items/ItemForm";
import { createEmptyItemFormValues } from "@/hooks/useCreateItemForm";
import { useTranslation } from "@/lib/i18n";
import type { ItemDto } from "@/services/types";

export function itemDtoToFormValues(item: ItemDto): ItemFormValues {
  return createEmptyItemFormValues({
    name: item.name ?? "",
    sku: item.sku ?? "",
    barcode: item.barcode ?? "",
    cost: item.cost != null ? String(item.cost) : "",
    price: item.price != null ? String(item.price) : "",
    itemType: item.itemType ?? "",
    brand: item.brand ?? "",
    photoData: item.photoData ?? "",
    initialQuantity: String(item.initialQuantity ?? 0),
    locationId: item.locationId != null ? String(item.locationId) : "",
    customFields: item.customFields ?? {},
  });
}

interface UseEditItemFormOptions {
  teamId: number;
  itemId: number;
  initialItem: ItemDto;
  onSuccess?: () => Promise<void> | void;
}

export function useEditItemForm({
  teamId,
  itemId,
  initialItem,
  onSuccess,
}: UseEditItemFormOptions) {
  const { t } = useTranslation();
  const [form, setForm] = useState<ItemFormValues>(() =>
    itemDtoToFormValues(initialItem)
  );
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setForm(itemDtoToFormValues(initialItem));
    setError("");
  }, [initialItem]);

  const updateField = (field: keyof ItemFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateCustomField = (fieldKey: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      customFields: { ...prev.customFields, [fieldKey]: value },
    }));
  };

  const generateSKU = () => {
    if (form.name.trim()) {
      updateField(
        "sku",
        form.name.toUpperCase().replace(/\s+/g, "-").substring(0, 20)
      );
    }
  };

  const generateBarcode = () => {
    updateField(
      "barcode",
      Math.floor(1000000000000 + Math.random() * 9000000000000).toString()
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError(t.itemForm.itemNameRequired);
      return;
    }

    if (!form.barcode.trim()) {
      setError(t.itemForm.barcodeRequired);
      return;
    }

    setIsLoading(true);

    const customFields = Object.fromEntries(
      Object.entries(form.customFields)
        .map(([key, value]) => [key, value.trim()])
        .filter(([, value]) => value.length > 0)
    );

    const result = await api.updateTeamItem(teamId, itemId, {
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      barcode: form.barcode.trim(),
      cost: form.cost ? parseFloat(form.cost) : null,
      price: form.price ? parseFloat(form.price) : null,
      itemType: form.itemType.trim() || null,
      brand: form.brand.trim() || null,
      photoData: form.photoData || null,
      customFields: Object.keys(customFields).length > 0 ? customFields : null,
      locationId: form.locationId ? Number(form.locationId) : null,
    });

    if (!result.ok) {
      setError(result.error.message || t.itemForm.unexpectedError);
      setIsLoading(false);
      return;
    }

    await onSuccess?.();
    setIsLoading(false);
  };

  return {
    form,
    error,
    isLoading,
    updateField,
    updateCustomField,
    generateSKU,
    generateBarcode,
    handleSubmit,
  };
}
