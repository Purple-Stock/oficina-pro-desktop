import { useEffect, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import * as api from "@/api/desktop-api";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
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
  SelectedQuantityItem,
  StockOperationItem,
  StockOperationLocation,
  StockOperationTeam,
} from "@/pages/team/shared/stock-operation-types";

interface StockOutPageClientProps {
  items: StockOperationItem[];
  locations: StockOperationLocation[];
  team: StockOperationTeam;
}

export function StockOutPageClient({
  items,
  locations,
  team,
}: StockOutPageClientProps) {
  const { t } = useTranslation();
  const defaultLocation =
    locations.length > 0 ? locations[0].id.toString() : "";
  const [selectedLocation, setSelectedLocation] = useState(defaultLocation);
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedQuantityItem[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [feedback, setFeedback] = useState<StockOperationFeedbackMessage | null>(
    null
  );

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
    if (exists) {
      setSelectedItems((current) =>
        current.map((entry) =>
          entry.item.id === item.id
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry
        )
      );
    } else {
      setSelectedItems((current) => [...current, { item, quantity: 1 }]);
    }
    setItemSearch("");
  };

  const handleBarcodeScan = (barcode: string) => {
    const foundItem = items.find((item) => item.barcode === barcode);
    if (foundItem) {
      handleAddItem(foundItem);
      showFeedback({
        type: "success",
        title: t.stockOut.itemFound,
        description: `${foundItem.name || t.items.unnamedItem} ${t.stockOut.itemAddedToList}`,
      });
      return;
    }
    showFeedback({
      type: "error",
      title: t.stockOut.itemNotFound,
      description: `${t.stockOut.noItemWithBarcode} ${barcode}`,
    });
  };

  const handleQuantityChange = (itemId: number, quantity: number) => {
    if (quantity < 0) return;
    const entry = selectedItems.find((selected) => selected.item.id === itemId);
    const maxStock = entry?.item.currentStock ?? 0;
    if (quantity > maxStock) {
      showFeedback({
        type: "error",
        title: t.common.error,
        description: t.stockOut.quantityExceedsStock,
      });
      return;
    }
    setSelectedItems((current) =>
      current.map((selected) =>
        selected.item.id === itemId ? { ...selected, quantity } : selected
      )
    );
  };

  const handleRemoveItem = (itemId: number) => {
    setSelectedItems((current) =>
      current.filter((selected) => selected.item.id !== itemId)
    );
  };

  const totalItems = selectedItems.reduce((sum, entry) => sum + entry.quantity, 0);

  const handleSubmit = async () => {
    setFeedback(null);

    if (!selectedLocation) {
      showFeedback({
        type: "error",
        title: t.common.error,
        description: t.stockOut.selectLocationFirst,
      });
      return;
    }

    if (selectedItems.length === 0) {
      showFeedback({
        type: "error",
        title: t.common.error,
        description: t.stockOut.noItemsSelected,
      });
      return;
    }

    const invalidItem = selectedItems.find(
      (entry) => !entry.quantity || entry.quantity <= 0
    );
    if (invalidItem) {
      showFeedback({
        type: "error",
        title: t.common.error,
        description: t.stockOut.quantityRequired,
      });
      return;
    }

    const exceedsStock = selectedItems.find((entry) => {
      const currentStock = entry.item.currentStock ?? 0;
      return entry.quantity > currentStock;
    });
    if (exceedsStock) {
      showFeedback({
        type: "error",
        title: t.common.error,
        description: t.stockOut.quantityExceedsStock,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const results = await Promise.all(
        selectedItems.map((entry) =>
          api.createTeamStockTransaction(team.id, {
            itemId: entry.item.id,
            transactionType: "stock_out",
            quantity: entry.quantity,
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
          description: firstError.error.message || t.stockOut.partialRemoveError,
        });
        return;
      }

      showFeedback({
        type: "success",
        title: t.common.success,
        description: t.stockOut.stockRemovedSuccess,
      });
      setSelectedItems([]);
      setNotes("");
      setItemSearch("");
    } catch {
      showFeedback({
        type: "error",
        title: t.common.error,
        description: t.stockOut.removeError,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TeamLayout team={team} activeMenuItem="stock-out">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-red-600 mb-1 sm:mb-2">
          {t.stockOut.title}
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-gray-600">
          {t.stockOut.subtitle}
        </p>
      </div>

      <StockOperationFeedback feedback={feedback} />

      <div className="mb-4 sm:mb-6">
        <Label htmlFor="location" className="text-sm font-semibold text-gray-700 mb-2 block">
          {t.stockOut.locationRequired}
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
        label={t.stockOut.items}
        searchPlaceholder={t.stockOut.searchItem}
        clearFilterLabel={t.common.clearFilter}
        scanBarcodeLabel={t.stockOut.scanBarcode}
        unnamedItemLabel={t.items.unnamedItem}
        currentStockLabel={t.stockOut.currentStockLabel}
        itemSearch={itemSearch}
        filteredItems={filteredItems}
        hasItemFilters={hasItemFilters}
        onItemSearchChange={setItemSearch}
        onClear={() => setItemSearch("")}
        onOpenScanner={() => setIsScannerOpen(true)}
        onAddItem={handleAddItem}
      />

      <div className="mb-4 sm:mb-6 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.stockOut.item}
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                  {t.stockOut.currentStock}
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                  {t.items.sku}
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.stockOut.quantityToRemove}
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.common.actions}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {selectedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 sm:px-6 py-8 text-center text-gray-500 text-sm">
                    {t.stockOut.noItemsSelected}
                  </td>
                </tr>
              ) : (
                selectedItems.map((selectedItem) => {
                  const maxStock = selectedItem.item.currentStock ?? 0;
                  return (
                    <tr key={selectedItem.item.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-4 sm:px-6 py-4 sm:py-5">
                        <div className="text-sm font-bold text-gray-900">
                          {selectedItem.item.name || t.items.unnamedItem}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 sm:py-5 hidden sm:table-cell">
                        <span className="text-sm font-medium text-gray-900">{maxStock}</span>
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
                              handleQuantityChange(
                                selectedItem.item.id,
                                selectedItem.quantity - 1
                              )
                            }
                            className="p-1.5 text-gray-500 hover:text-[#1D4ED8] hover:bg-blue-50 rounded-lg transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
                            disabled={selectedItem.quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <Input
                            type="number"
                            min="0.1"
                            step="0.1"
                            max={maxStock}
                            value={selectedItem.quantity}
                            onChange={(event) =>
                              handleQuantityChange(
                                selectedItem.item.id,
                                parseDecimalInput(event.target.value)
                              )
                            }
                            className="w-20 sm:w-24 h-9 sm:h-10 text-center text-sm font-semibold border-gray-300 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleQuantityChange(
                                selectedItem.item.id,
                                selectedItem.quantity + 1
                              )
                            }
                            className="p-1.5 text-gray-500 hover:text-[#1D4ED8] hover:bg-blue-50 rounded-lg transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
                            disabled={selectedItem.quantity >= maxStock}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-4 sm:mb-6">
        <Label htmlFor="notes" className="text-sm font-semibold text-gray-700 mb-2 block">
          {t.stockOut.notes}
        </Label>
        <Textarea
          id="notes"
          placeholder={t.stockOut.notesPlaceholder}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="min-h-[100px] text-base border-gray-300 focus:border-[#1D4ED8] focus:ring-[#1D4ED8] resize-y"
          rows={4}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-gray-200">
        <div className="text-sm sm:text-base font-semibold text-gray-700">
          {t.stockOut.totalItemsToRemove}:{" "}
          <span className="text-[#1D4ED8]">{totalItems}</span>
        </div>
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting || selectedItems.length === 0 || !selectedLocation}
          className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-lg hover:shadow-xl transition-all w-full sm:w-auto px-6 sm:px-8"
        >
          {isSubmitting ? t.common.loading : t.stockOut.removeStock}
        </Button>
      </div>

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
        onManualEnter={handleBarcodeScan}
      />
    </TeamLayout>
  );
}