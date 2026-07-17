import { useEffect, useState } from "react";
import { Minus, PackagePlus, Plus, Search, Trash2 } from "lucide-react";
import * as api from "@/api/desktop-api";
import { CreateItemInlineModal } from "@/components/stock/CreateItemInlineModal";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formSelectClass } from "@/lib/styles";
import { useTranslation } from "@/lib/i18n";
import type { ItemDto } from "@/services/types";
import type {
  SelectedStockInItem,
  StockInItem,
  StockInLocation,
  StockInTeam,
} from "./types";

interface StockInPageClientProps {
  items: StockInItem[];
  locations: StockInLocation[];
  team: StockInTeam;
  onItemsChange?: (items: StockInItem[]) => void;
}

function looksLikeBarcode(value: string) {
  return /^\d{8,}$/.test(value.trim());
}

function normalizeItemForStockIn(item: ItemDto): StockInItem {
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    barcode: item.barcode,
    currentStock: item.currentStock,
    locationName: item.locationName,
  };
}

type FeedbackMessage = {
  type: "success" | "error" | "info";
  title: string;
  description?: string;
};

export function StockInPageClient({
  items,
  locations,
  team,
  onItemsChange,
}: StockInPageClientProps) {
  const { t } = useTranslation();
  const defaultLocation =
    locations.length > 0 ? locations[0].id.toString() : "";
  const [selectedLocation, setSelectedLocation] = useState(defaultLocation);
  const [availableItems, setAvailableItems] = useState<StockInItem[]>(items);
  const [itemSearch, setItemSearch] = useState("");
  const [itemSearchSource, setItemSearchSource] = useState<
    "search" | "barcode"
  >("search");
  const [selectedItems, setSelectedItems] = useState<SelectedStockInItem[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateItemModalOpen, setIsCreateItemModalOpen] = useState(false);
  const [createItemInitialValues, setCreateItemInitialValues] = useState({
    name: "",
    barcode: "",
  });
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

  useEffect(() => {
    setAvailableItems(items);
  }, [items]);

  useEffect(() => {
    if (!defaultLocation) return;
    setSelectedLocation((current) => current || defaultLocation);
  }, [defaultLocation]);

  const showFeedback = (message: FeedbackMessage) => {
    setFeedback(message);
  };

  const normalizedSearch = itemSearch.trim().toLowerCase();
  const hasItemFilters = normalizedSearch.length > 0;

  const filteredItems = availableItems.filter((item) => {
    if (!hasItemFilters) return false;
    return Boolean(
      item.name?.toLowerCase().includes(normalizedSearch) ||
      item.sku?.toLowerCase().includes(normalizedSearch) ||
      item.barcode?.toLowerCase().includes(normalizedSearch)
    );
  });

  const showCreateItemState = hasItemFilters && filteredItems.length === 0;

  const openCreateItemModal = (value: string, source: "search" | "barcode") => {
    const trimmedValue = value.trim();
    setCreateItemInitialValues({
      name: source === "search" ? trimmedValue : "",
      barcode:
        source === "barcode" || looksLikeBarcode(trimmedValue)
          ? trimmedValue
          : "",
    });
    setIsCreateItemModalOpen(true);
  };

  const handleAddItem = (item: StockInItem) => {
    const exists = selectedItems.find((entry) => entry.item.id === item.id);
    if (exists) {
      setSelectedItems((currentItems) =>
        currentItems.map((entry) =>
          entry.item.id === item.id
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry
        )
      );
    } else {
      setSelectedItems((currentItems) => [
        ...currentItems,
        { item, quantity: 1 },
      ]);
    }
    setItemSearch("");
    setItemSearchSource("search");
  };

  const handleCreateItemSuccess = async (item: ItemDto) => {
    const normalizedItem = normalizeItemForStockIn(item);

    setAvailableItems((currentItems) => {
      if (
        currentItems.some((currentItem) => currentItem.id === normalizedItem.id)
      ) {
        return currentItems;
      }
      const nextItems = [normalizedItem, ...currentItems];
      onItemsChange?.(nextItems);
      return nextItems;
    });

    handleAddItem(normalizedItem);
    setIsCreateItemModalOpen(false);
    showFeedback({
      type: "success",
      title: t.common.success,
      description: t.stockIn.createItemSuccessAndAdded,
    });
  };

  const handleQuantityChange = (itemId: number, quantity: number) => {
    if (quantity < 0) return;
    setSelectedItems((currentItems) =>
      currentItems.map((entry) =>
        entry.item.id === itemId ? { ...entry, quantity } : entry
      )
    );
  };

  const handleRemoveItem = (itemId: number) => {
    setSelectedItems((currentItems) =>
      currentItems.filter((entry) => entry.item.id !== itemId)
    );
  };

  const totalItems = selectedItems.reduce(
    (sum, entry) => sum + entry.quantity,
    0
  );

  const handleSubmit = async () => {
    setFeedback(null);

    if (!selectedLocation) {
      showFeedback({
        type: "error",
        title: t.common.error,
        description: t.stockIn.selectLocationFirst,
      });
      return;
    }

    if (selectedItems.length === 0) {
      showFeedback({
        type: "error",
        title: t.common.error,
        description: t.stockIn.noItemsSelected,
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
        description: t.stockIn.quantityRequired,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const results = await Promise.all(
        selectedItems.map((entry) =>
          api.createTeamStockTransaction(team.id, {
            itemId: entry.item.id,
            transactionType: "stock_in",
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
          description: firstError.error.message || t.stockIn.partialAddError,
        });
        return;
      }

      showFeedback({
        type: "success",
        title: t.common.success,
        description: t.stockIn.stockAddedSuccess,
      });
      setSelectedItems([]);
      setNotes("");
      setItemSearch("");
      setItemSearchSource("search");
    } catch {
      showFeedback({
        type: "error",
        title: t.common.error,
        description: t.stockIn.addError,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TeamLayout team={team} activeMenuItem="stock-in">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-600 mb-1 sm:mb-2">
          {t.stockIn.title}
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-gray-600">
          {t.stockIn.subtitle}
        </p>
      </div>

      {feedback ? (
        <Alert
          className={`mb-6 border-l-4 ${
            feedback.type === "success"
              ? "border-l-green-500 bg-green-50/50"
              : feedback.type === "error"
                ? "border-l-red-500 bg-red-50/50"
                : "border-l-blue-500 bg-blue-50/50"
          }`}
        >
          <AlertDescription
            className={`text-sm ${
              feedback.type === "success"
                ? "text-green-700"
                : feedback.type === "error"
                  ? "text-red-700"
                  : "text-blue-700"
            }`}
          >
            <span className="font-semibold">{feedback.title}</span>
            {feedback.description ? ` — ${feedback.description}` : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="mb-4 sm:mb-6">
        <Label
          htmlFor="location"
          className="text-sm font-semibold text-gray-700 mb-2 block"
        >
          {t.stockIn.locationRequired}
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

      <div className="mb-4 sm:mb-6">
        <Label
          htmlFor="items"
          className="text-sm font-semibold text-gray-700 mb-2 block"
        >
          {t.stockIn.items}
        </Label>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            <Input
              id="items"
              type="text"
              placeholder={t.stockIn.searchItem}
              value={itemSearch}
              onChange={(event) => {
                setItemSearchSource("search");
                setItemSearch(event.target.value);
              }}
              className="pl-9 sm:pl-10 h-11 text-base border-gray-300 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]"
            />
            {hasItemFilters && filteredItems.length > 0 ? (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleAddItem(item)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">
                      {item.name || t.items.unnamedItem}
                    </div>
                    {item.sku ? (
                      <div className="text-xs text-gray-500">
                        SKU: {item.sku}
                      </div>
                    ) : null}
                    {item.currentStock !== null ? (
                      <div className="text-xs text-gray-500">
                        {t.stockIn.currentStockLabel}: {item.currentStock}
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setItemSearch("");
              setItemSearchSource("search");
            }}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 h-11"
          >
            {t.common.clearFilter}
          </Button>
        </div>

        {showCreateItemState ? (
          <div className="mt-3 rounded-xl border border-dashed border-blue-200 bg-blue-50/60 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {t.stockIn.noSearchResultsCreate}
              </p>
              <p className="text-xs sm:text-sm text-gray-600">
                {t.stockIn.noSearchResultsCreateHint}
              </p>
            </div>
            <Button
              type="button"
              onClick={() => openCreateItemModal(itemSearch, itemSearchSource)}
              className="bg-[#1D4ED8] hover:bg-[#1D4ED8]/90 text-white w-full sm:w-auto"
            >
              <PackagePlus className="h-4 w-4 mr-2" />
              {t.stockIn.createItemCta}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mb-4 sm:mb-6 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.stockIn.item}
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                  {t.stockIn.currentStock}
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                  {t.items.sku}
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.stockIn.quantityToAdd}
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
                    {t.stockIn.noItemsSelected}
                  </td>
                </tr>
              ) : (
                selectedItems.map((selectedItem) => (
                  <tr
                    key={selectedItem.item.id}
                    className="hover:bg-blue-50/50 transition-colors"
                  >
                    <td className="px-4 sm:px-6 py-4 sm:py-5">
                      <div>
                        <div className="text-sm font-bold text-gray-900">
                          {selectedItem.item.name || t.items.unnamedItem}
                        </div>
                        <div className="text-xs text-gray-500 sm:hidden mt-1">
                          {t.stockIn.currentStockLabel}:{" "}
                          {selectedItem.item.currentStock ?? 0}
                        </div>
                        <div className="text-xs text-gray-500 sm:hidden mt-1">
                          {t.items.sku}: {selectedItem.item.sku || "-"}
                        </div>
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
                          min="1"
                          value={selectedItem.quantity}
                          onChange={(event) =>
                            handleQuantityChange(
                              selectedItem.item.id,
                              parseInt(event.target.value, 10) || 0
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
          {t.stockIn.notes}
        </Label>
        <Textarea
          id="notes"
          placeholder={t.stockIn.notesPlaceholder}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="min-h-[100px] text-base border-gray-300 focus:border-[#1D4ED8] focus:ring-[#1D4ED8] resize-y"
          rows={4}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-gray-200">
        <div className="text-sm sm:text-base font-semibold text-gray-700">
          {t.stockIn.totalItemsToAdd}:{" "}
          <span className="text-[#1D4ED8]">{totalItems}</span>
        </div>
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={
            isSubmitting || selectedItems.length === 0 || !selectedLocation
          }
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all w-full sm:w-auto px-6 sm:px-8"
        >
          {isSubmitting ? t.common.loading : t.stockIn.addStock}
        </Button>
      </div>
      <CreateItemInlineModal
        isOpen={isCreateItemModalOpen}
        team={team}
        locations={locations}
        initialValues={createItemInitialValues}
        onClose={() => setIsCreateItemModalOpen(false)}
        onSuccess={handleCreateItemSuccess}
      />
    </TeamLayout>
  );
}
