import { Link } from "react-router-dom";
import {
  DollarSign,
  FileText,
  MapPin,
  QrCode,
  Square,
  Tag,
} from "lucide-react";
import { FormSection } from "@/components/shared/FormSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formOutlineButton,
  formPrimaryButton,
  formSelectClass,
} from "@/lib/styles";
import type { useTranslation } from "@/lib/i18n";
import type { LocationDto } from "@/services/types";

export interface ItemFormValues {
  name: string;
  sku: string;
  barcode: string;
  cost: string;
  price: string;
  itemType: string;
  brand: string;
  photoData: string;
  customFields: Record<string, string>;
  initialQuantity: string;
  locationId: string;
}

export interface CustomFieldSchemaEntry {
  key: string;
  label: string;
  active: boolean;
}

interface ItemFormProps {
  t: ReturnType<typeof useTranslation>["t"];
  values: ItemFormValues;
  customFieldSchema: CustomFieldSchemaEntry[];
  locations?: Array<Pick<LocationDto, "id" | "name">>;
  isLoading: boolean;
  cancelHref?: string;
  onCancel?: () => void;
  mode: "create" | "edit";
  onSubmit: (event: React.FormEvent) => void;
  onValueChange: (field: keyof ItemFormValues, value: string) => void;
  onCustomFieldChange: (fieldKey: string, value: string) => void;
  onGenerateSKU: () => void;
  onGenerateBarcode: () => void;
}

export function ItemForm({
  t,
  values,
  customFieldSchema,
  locations,
  isLoading,
  cancelHref,
  onCancel,
  mode,
  onSubmit,
  onValueChange,
  onCustomFieldChange,
  onGenerateSKU,
  onGenerateBarcode,
}: ItemFormProps) {
  const activeCustomFieldSchema = customFieldSchema.filter(
    (field) => field.active
  );

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        onValueChange("photoData", result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <FormSection title={t.itemForm.itemInformation}>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-900">
              {t.itemForm.nameLabel} <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="name"
                type="text"
                placeholder={t.itemForm.itemNamePlaceholder}
                value={values.name}
                onChange={(event) => onValueChange("name", event.target.value)}
                className="w-full pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku" className="text-gray-900">
              {t.itemForm.skuLabel}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="sku"
                type="text"
                placeholder={t.itemForm.skuPlaceholder}
                value={values.sku}
                onChange={(event) => onValueChange("sku", event.target.value)}
                className="w-full flex-1"
              />
              <button
                type="button"
                onClick={onGenerateSKU}
                className="text-sm text-[#1D4ED8] hover:underline whitespace-nowrap"
              >
                {t.itemForm.generate}
              </button>
              <button
                type="button"
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <QrCode className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcode" className="text-gray-900">
              {t.itemForm.barcodeLabel} <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="barcode"
                type="text"
                placeholder={t.itemForm.barcodePlaceholder}
                value={values.barcode}
                onChange={(event) =>
                  onValueChange("barcode", event.target.value)
                }
                className="w-full flex-1"
                required
              />
              <button
                type="button"
                onClick={onGenerateBarcode}
                className="text-sm text-[#1D4ED8] hover:underline whitespace-nowrap"
              >
                {t.itemForm.generate}
              </button>
              <button
                type="button"
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <QrCode className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="photo" className="text-gray-900">
              {t.itemForm.photoLabel}
            </Label>
            <Input
              id="photo"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="w-full"
            />
            {values.photoData ? (
              <div className="mt-2">
                <img
                  src={values.photoData}
                  alt="Item preview"
                  className="h-24 w-24 object-cover rounded-md border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => onValueChange("photoData", "")}
                  className="mt-2 text-sm text-red-600 hover:underline"
                >
                  {t.itemForm.removePhoto}
                </button>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost" className="text-gray-900">
                {t.itemForm.costLabel}
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="cost"
                  type="text"
                  placeholder="0.00"
                  value={values.cost}
                  onChange={(event) =>
                    onValueChange(
                      "cost",
                      event.target.value.replace(/[^\d.]/g, "")
                    )
                  }
                  className="w-full pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price" className="text-gray-900">
                {t.itemForm.priceLabel}
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="price"
                  type="text"
                  placeholder="0.00"
                  value={values.price}
                  onChange={(event) =>
                    onValueChange(
                      "price",
                      event.target.value.replace(/[^\d.]/g, "")
                    )
                  }
                  className="w-full pl-10"
                />
              </div>
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection title={t.itemForm.itemAttributes}>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="itemType" className="text-gray-900">
              {t.itemForm.typeLabel}
            </Label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="itemType"
                type="text"
                placeholder={t.itemForm.itemTypePlaceholder}
                value={values.itemType}
                onChange={(event) =>
                  onValueChange("itemType", event.target.value)
                }
                className="w-full pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand" className="text-gray-900">
              {t.itemForm.brandLabel}
            </Label>
            <div className="relative">
              <Square className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="brand"
                type="text"
                placeholder={t.itemForm.brandPlaceholder}
                value={values.brand}
                onChange={(event) => onValueChange("brand", event.target.value)}
                className="w-full pl-10"
              />
            </div>
          </div>
        </div>
      </FormSection>

      {locations && locations.length > 0 && mode === "create" && (
        <FormSection title={t.itemForm.initialStockTitle}>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="initialQuantity" className="text-gray-900">
                {t.items.initialQuantity}
              </Label>
              <Input
                id="initialQuantity"
                type="number"
                min="0"
                value={values.initialQuantity}
                onChange={(event) =>
                  onValueChange("initialQuantity", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="locationId" className="text-gray-900">
                {t.items.location}
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10 pointer-events-none" />
                <select
                  id="locationId"
                  value={values.locationId}
                  onChange={(event) =>
                    onValueChange("locationId", event.target.value)
                  }
                  className={`${formSelectClass} pl-10`}
                >
                  <option value="">—</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </FormSection>
      )}

      {activeCustomFieldSchema.length > 0 && (
        <FormSection title={t.itemForm.customFieldsTitle}>
          <div className="space-y-4">
            {activeCustomFieldSchema.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label
                  htmlFor={`custom-field-${field.key}`}
                  className="text-gray-900"
                >
                  {field.label}
                </Label>
                <Input
                  id={`custom-field-${field.key}`}
                  type="text"
                  placeholder={t.itemForm.customFieldPlaceholder}
                  value={values.customFields[field.key] ?? ""}
                  onChange={(event) =>
                    onCustomFieldChange(field.key, event.target.value)
                  }
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </FormSection>
      )}

      <div className="flex items-center gap-4 pt-4">
        <Button
          type="submit"
          disabled={isLoading}
          className={formPrimaryButton}
        >
          {mode === "create"
            ? isLoading
              ? t.itemForm.creating
              : t.itemForm.createAction
            : isLoading
              ? t.itemForm.updating
              : t.itemForm.updateAction}
        </Button>
        {cancelHref ? (
          <Link to={cancelHref}>
            <Button
              type="button"
              variant="outline"
              className={formOutlineButton}
            >
              {t.common.cancel}
            </Button>
          </Link>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className={formOutlineButton}
          >
            {t.common.cancel}
          </Button>
        )}
      </div>
    </form>
  );
}
