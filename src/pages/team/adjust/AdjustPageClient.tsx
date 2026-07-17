import { useEffect, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import * as api from "@/api/desktop-api";
import { StockItemSearchPanel } from "@/components/stock/StockItemSearchPanel";
import {
  StockOperationFeedback,
  type StockOperationFeedbackMessage,
} from "@/components/stock/StockOperationFeedback";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseDecimalInput } from "@/lib/parse-decimal-input";
import { formSelectClass } from "@/lib/styles";
import { useTranslation } from "@/lib/i18n";
import type {
  SelectedAdjustItem,
  StockOperationItem,
  StockOperationLocation,
  StockOperationTeam,
} from "@/pages/team/shared/stock-operation-types";

interface AdjustPageClientProps {
  items: StockOperationItem[];
  locations: StockOperationLocation[];
  team: StockOperationTeam;
}

export function AdjustPageClient({
  items,
  locations,
  team,
}: AdjustPageClientProps) {
  const { t } = useTranslation();
  const defaultLocation =
    locations.length > 0 ? locations[0].id.toString() : "";
  const [selectedLocation, setSelectedLocation] = useState(defaultLocation);
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedAdjustItem[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] =
    useState<StockOperationFeedbackMessage | null>(null);

  useEffect(() => {
    if (!defaultLocation) return;
    setSelectedLocation((current) => current || defaultLocation);
  }, [defaultLocation]);

  const normalizedSearch = itemSearch.trim().toLowerCase();
  const hasItemFilters = normalizedSearch.length > 0;
  const filteredItems = items.filter((item) => {
    if (!hasItemFilters) return false;
    return Boolean(
      item.name?.toLowerCase().includes(normalizedSearch) ||
      item.sku?.toLowerCase().includes(normalizedSearch) ||
      item.barcode?.toLowerCase().includes(normalizedSearch)
    );
  });

  const showFeedback = (message: StockOperationFeedbackMessage) => {
    setFeedback(message);
  };

  const handleAddItem = (item: StockOperationItem) => {
    const exists = selectedItems.find((entry) => entry.item.id === item.id);
    if (!exists) {
      setSelectedItems((current) => [
        ...current,
        { item, newStock: item.currentStock ?? 0 },
      ]);
    }
    setItemSearch("");
  };

  const handleStockChange = (itemId: number, newStock: number) => {
    if (newStock < 0) return;
    setSelectedItems((current) =>
      current.map((entry) =>
        entry.item.id === itemId ? { ...entry, newStock } : entry
      )
    );
  };

  const handleRemoveItem = (itemId: number) => {
    setSelectedItems((current) =>
      current.filter((entry) => entry.item.id !== itemId)
    );
  };

  const handleSubmit = async () => {
    setFeedback(null);

    if (!selectedLocation) {
      showFeedback({
        type: "error",
        title: t.common.error,
        description: t.adjust.selectLocationFirst,
      });
      return;
    }

    if (selectedItems.length === 0) {
      showFeedback({
        type: "error",
        title: t.common.error,
        description: t.adjust.noItemsSelected,
      });
      return;
    }

    const invalidItem = selectedItems.find((entry) => entry.newStock < 0);
    if (invalidItem) {
      showFeedback({
        type: "error",
        title: t.common.error,
        description: t.adjust.quantityRequired,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const results = await Promise.all(
        selectedItems.map((entry) =>
          api.createTeamStockTransaction(team.id, {
            itemId: entry.item.id,
            transactionType: "adjust",
            quantity: entry.newStock,
            destinationLocationId: parseInt(selectedLocation, 10),
            notes: notes || null,
          })
        )
      );

      const firstError = results.find((result) => !result.ok);
      if (firstError && !firstError.ok) {
        showFeedback({
          type: "error",
          title: t.common.error,
          description: firstError.error.message || t.adjust.partialAdjustError,
        });
        return;
      }

      showFeedback({
        type: "success",
        title: t.common.success,
        description: t.adjust.stockAdjustedSuccess,
      });
      setSelectedItems([]);
      setNotes("");
      setItemSearch("");
    } catch {
      showFeedback({
        type: "error",
        title: t.common.error,
        description: t.adjust.adjustError,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TeamLayout team={team} activeMenuItem="adjust">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-orange-600 mb-1 sm:mb-2">
          {t.adjust.title}
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-gray-600">
          {t.adjust.subtitle}
        </p>
      </div>

      <StockOperationFeedback feedback={feedback} />

      <div className="mb-4 sm:mb-6">
        <Label
          htmlFor="location"
          className="text-sm font-semibold text-gray-700 mb-2 block"
        >
          {t.adjust.locationRequired}
        </Label>
        <select
          id="location"
          value={selectedLocation}
          onChange={(event) => setSelectedLocation(event.target.value)}
          className={`${formSelectClass} h-11 text-base border-gray-300`}
        >
          {locations.map((location) => (
            <option key={location.id} value={location.id.toString()}>
              {location.name}
            </option>
          ))}
        </select>
      </div>

      <StockItemSearchPanel
        label={t.adjust.items}
        searchPlaceholder={t.adjust.searchItem}
        clearFilterLabel={t.common.clearFilter}
        unnamedItemLabel={t.items.unnamedItem}
        currentStockLabel={t.adjust.currentStockLabel}
        itemSearch={itemSearch}
        filteredItems={filteredItems}
        hasItemFilters={hasItemFilters}
        onItemSearchChange={setItemSearch}
        onClear={() => setItemSearch("")}
        onAddItem={handleAddItem}
      />

      <div className="mb-4 sm:mb-6 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.adjust.item}
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                  {t.adjust.currentStock}
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                  {t.items.sku}
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.adjust.newStock}
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.common.actions}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {selectedItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 sm:px-6 py-8 text-center text-gray-500 text-sm"
                  >
                    {t.adjust.noItemsSelected}
                  </td>
                </tr>
              ) : (
                selectedItems.map((selectedItem) => (
                  <tr
                    key={selectedItem.item.id}
                    className="hover:bg-blue-50/50 transition-colors"
                  >
                    <td className="px-4 sm:px-6 py-4 sm:py-5">
                      <div className="text-sm font-bold text-gray-900">
                        {selectedItem.item.name || t.items.unnamedItem}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 sm:py-5 hidden sm:table-cell">
                      <span className="text-sm font-medium text-gray-900">
                        {selectedItem.item.currentStock ?? 0}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 sm:py-5 hidden md:table-cell">
                      <span className="text-sm font-medium text-gray-900">
                        {selectedItem.item.sku || "-"}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 sm:py-5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleStockChange(
                              selectedItem.item.id,
                              selectedItem.newStock - 1
                            )
                          }
                          className="p-1.5 text-gray-500 hover:text-[#1D4ED8] hover:bg-blue-50 rounded-lg transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
                          disabled={selectedItem.newStock <= 0}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={selectedItem.newStock}
                          onChange={(event) =>
                            handleStockChange(
                              selectedItem.item.id,
                              parseDecimalInput(event.target.value)
                            )
                          }
                          className="w-20 sm:w-24 h-9 sm:h-10 text-center text-sm font-semibold border-gray-300 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleStockChange(
                              selectedItem.item.id,
                              selectedItem.newStock + 1
                            )
                          }
                          className="p-1.5 text-gray-500 hover:text-[#1D4ED8] hover:bg-blue-50 rounded-lg transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 sm:py-5 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(selectedItem.item.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
                        aria-label={t.common.delete}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-4 sm:mb-6">
        <Label
          htmlFor="notes"
          className="text-sm font-semibold text-gray-700 mb-2 block"
        >
          {t.adjust.notes}
        </Label>
        <Textarea
          id="notes"
          placeholder={t.adjust.notesPlaceholder}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="min-h-[100px] text-base border-gray-300 focus:border-[#1D4ED8] focus:ring-[#1D4ED8] resize-y"
          rows={4}
        />
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200">
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={
            isSubmitting || selectedItems.length === 0 || !selectedLocation
          }
          className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-lg hover:shadow-xl transition-all w-full sm:w-auto px-6 sm:px-8"
        >
          {isSubmitting ? t.common.loading : t.adjust.adjustStock}
        </Button>
      </div>
    </TeamLayout>
  );
}
