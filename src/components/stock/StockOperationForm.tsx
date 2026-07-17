import { FileText, MapPin, Package, Hash } from "lucide-react";
import { FormSection } from "@/components/shared/FormSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formPrimaryButton, formSelectClass } from "@/lib/styles";
import type { useTranslation } from "@/lib/i18n";
import type { StockTransactionType } from "@/db/types";
import type { ItemDto, LocationDto } from "@/services/types";

interface StockOperationFormProps {
  t: ReturnType<typeof useTranslation>["t"];
  transactionType: StockTransactionType;
  items: ItemDto[];
  locations: LocationDto[];
  itemId: string;
  quantity: string;
  destinationLocationId: string;
  notes: string;
  isLoading: boolean;
  submitLabel: string;
  loadingLabel: string;
  onItemIdChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onDestinationLocationIdChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}

export function StockOperationForm({
  t,
  transactionType,
  items,
  locations,
  itemId,
  quantity,
  destinationLocationId,
  notes,
  isLoading,
  submitLabel,
  loadingLabel,
  onItemIdChange,
  onQuantityChange,
  onDestinationLocationIdChange,
  onNotesChange,
  onSubmit,
}: StockOperationFormProps) {
  const showDestination =
    transactionType === "move" ||
    transactionType === "stock_in" ||
    transactionType === "adjust";

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormSection title={t.stock.operationDetails}>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="itemId" className="text-gray-900">
              {t.stock.selectItem} <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10 pointer-events-none" />
              <select
                id="itemId"
                value={itemId}
                onChange={(event) => onItemIdChange(event.target.value)}
                className={`${formSelectClass} pl-10`}
                required
              >
                <option value="">—</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.currentStock})
                    {item.locationName ? ` · ${item.locationName}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {showDestination && (
            <div className="space-y-2">
              <Label htmlFor="destinationLocationId" className="text-gray-900">
                {transactionType === "move"
                  ? t.stock.destinationLocation
                  : t.stock.locationOptional}
                {transactionType === "move" && (
                  <span className="text-red-500"> *</span>
                )}
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10 pointer-events-none" />
                <select
                  id="destinationLocationId"
                  value={destinationLocationId}
                  onChange={(event) =>
                    onDestinationLocationIdChange(event.target.value)
                  }
                  className={`${formSelectClass} pl-10`}
                  required={transactionType === "move"}
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
          )}

          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-gray-900">
              {t.stock.quantity} <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                id="quantity"
                type="number"
                min="0"
                step="0.01"
                value={quantity}
                onChange={(event) => onQuantityChange(event.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-gray-900">
              {t.stock.notes}
            </Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Textarea
                id="notes"
                value={notes}
                onChange={(event) => onNotesChange(event.target.value)}
                className="min-h-[100px] pl-10"
                rows={4}
              />
            </div>
          </div>
        </div>
      </FormSection>

      <div className="flex items-center gap-4 pt-4">
        <Button
          type="submit"
          disabled={isLoading}
          className={formPrimaryButton}
        >
          {isLoading ? loadingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
