import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import * as api from "@/api/desktop-api";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
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

type DestinationTeam = { id: number; name: string };

interface MovePageClientProps {
  items: StockOperationItem[];
  locations: StockOperationLocation[];
  destinationTeams: DestinationTeam[];
  team: StockOperationTeam;
}

export function MovePageClient({
  items,
  locations,
  destinationTeams,
  team,
}: MovePageClientProps) {
  const { t } = useTranslation();
  const defaultSourceLocation =
    locations.length > 0 ? locations[0].id.toString() : "";
  const [activeTab, setActiveTab] = useState<"location" | "team">("location");
  const [sourceLocation, setSourceLocation] = useState(defaultSourceLocation);
  const [destinationLocation, setDestinationLocation] = useState("");
  const [destinationTeamId, setDestinationTeamId] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedQuantityItem[]>(
    []
  );
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] =
    useState<StockOperationFeedbackMessage | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const hasDestinationTeams = destinationTeams.length > 0;
  const isTeamTransferUnavailable =
    activeTab === "team" && !hasDestinationTeams;
  const selectedDestinationTeam =
    activeTab === "team"
      ? destinationTeams.find(
          (destination) => destination.id.toString() === destinationTeamId
        )
      : null;

  useEffect(() => {
    if (!defaultSourceLocation) return;
    setSourceLocation((current) => current || defaultSourceLocation);
  }, [defaultSourceLocation]);

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

  const handleQuantityChange = (itemId: number, quantity: number) => {
    if (quantity < 0) return;
    const entry = selectedItems.find((selected) => selected.item.id === itemId);
    const maxStock = entry?.item.currentStock ?? 0;
    if (quantity > maxStock) {
      showFeedback({
        type: "error",
        title: t.common.error,
        description: t.move.quantityExceedsStock,
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

  const totalItems = selectedItems.reduce(
    (sum, entry) => sum + entry.quantity,
    0
  );
  const totalQuantity = totalItems;

  const validateBeforeSubmit = (): boolean => {
    setFeedback(null);

    if (!sourceLocation) {
      showFeedback({
        type: "error",
        title: t.common.error,
        description: t.move.selectSourceLocationFirst,
      });
      return false;
    }

    if (activeTab === "location") {
      if (!destinationLocation) {
        showFeedback({
          type: "error",
          title: t.common.error,
          description: t.move.selectLocationsFirst,
        });
        return false;
      }
      if (sourceLocation === destinationLocation) {
        showFeedback({
          type: "error",
          title: t.common.error,
          description: t.move.sameLocationError,
        });
        return false;
      }
    } else if (!destinationTeamId) {
      showFeedback({
        type: "error",
        title: t.common.error,
        description: hasDestinationTeams
          ? t.move.selectDestinationTeamFirst
          : t.move.noActiveDestinationTeams,
      });
      return false;
    }

    if (selectedItems.length === 0) {
      showFeedback({
        type: "error",
        title: t.common.error,
        description: t.move.noItemsSelected,
      });
      return false;
    }

    const invalidItem = selectedItems.find(
      (entry) => !entry.quantity || entry.quantity <= 0
    );
    if (invalidItem) {
      showFeedback({
        type: "error",
        title: t.common.error,
        description: t.move.quantityRequired,
      });
      return false;
    }

    const exceedsStock = selectedItems.find((entry) => {
      const currentStock = entry.item.currentStock ?? 0;
      return entry.quantity > currentStock;
    });
    if (exceedsStock) {
      showFeedback({
        type: "error",
        title: t.common.error,
        description: t.move.quantityExceedsStock,
      });
      return false;
    }

    return true;
  };

  const submitLocationMove = async () => {
    const results = await Promise.all(
      selectedItems.map((entry) =>
        api.createTeamStockTransaction(team.id, {
          itemId: entry.item.id,
          transactionType: "move",
          quantity: entry.quantity,
          sourceLocationId: parseInt(sourceLocation, 10),
          destinationLocationId: parseInt(destinationLocation, 10),
          notes: notes || null,
        })
      )
    );

    const firstError = results.find((result) => !result.ok);
    if (firstError && !firstError.ok) {
      showFeedback({
        type: "error",
        title: t.common.error,
        description: firstError.error.message || t.move.partialMoveError,
      });
      return;
    }

    showFeedback({
      type: "success",
      title: t.common.success,
      description: t.move.stockMovedSuccess,
    });
    setDestinationLocation("");
    setSelectedItems([]);
    setNotes("");
    setItemSearch("");
  };

  const submitTeamTransfer = async () => {
    const destinationTeam = selectedDestinationTeam;
    if (!destinationTeam) return;

    for (const entry of selectedItems) {
      const stockOutResult = await api.createTeamStockTransaction(team.id, {
        itemId: entry.item.id,
        transactionType: "stock_out",
        quantity: entry.quantity,
        sourceLocationId: parseInt(sourceLocation, 10),
        notes: notes || null,
      });
      if (!stockOutResult.ok) {
        showFeedback({
          type: "error",
          title: t.common.error,
          description:
            stockOutResult.error.message || t.move.partialTeamTransferError,
        });
        return;
      }

      const destItemsResult = await api.listTeamItems(destinationTeam.id);
      if (!destItemsResult.ok) {
        showFeedback({
          type: "error",
          title: t.common.error,
          description:
            destItemsResult.error.message || t.move.teamTransferError,
        });
        return;
      }

      let destinationItemId = destItemsResult.data.items.find(
        (item) =>
          item.barcode &&
          entry.item.barcode &&
          item.barcode === entry.item.barcode
      )?.id;

      if (!destinationItemId) {
        if (!entry.item.barcode) {
          showFeedback({
            type: "error",
            title: t.common.error,
            description: t.move.teamTransferError,
          });
          return;
        }

        const createItemResult = await api.createTeamItem(destinationTeam.id, {
          name: entry.item.name,
          sku: entry.item.sku,
          barcode: entry.item.barcode,
          initialQuantity: 0,
        });
        if (!createItemResult.ok) {
          showFeedback({
            type: "error",
            title: t.common.error,
            description:
              createItemResult.error.message || t.move.teamTransferError,
          });
          return;
        }
        destinationItemId = createItemResult.data.item.id;
      }

      const stockInResult = await api.createTeamStockTransaction(
        destinationTeam.id,
        {
          itemId: destinationItemId,
          transactionType: "stock_in",
          quantity: entry.quantity,
          notes: notes
            ? `${t.move.transferSummaryToTeamPrefix} ${team.name}: ${notes}`
            : `${t.move.transferSummaryToTeamPrefix} ${team.name}`,
        }
      );
      if (!stockInResult.ok) {
        showFeedback({
          type: "error",
          title: t.common.error,
          description:
            stockInResult.error.message || t.move.partialTeamTransferError,
        });
        return;
      }

      await api.createTeamStockTransaction(team.id, {
        itemId: entry.item.id,
        transactionType: "move",
        quantity: entry.quantity,
        sourceLocationId: parseInt(sourceLocation, 10),
        destinationKind: "team",
        destinationLabel: destinationTeam.name,
        notes: notes || null,
      });
    }

    showFeedback({
      type: "success",
      title: t.common.success,
      description: `${t.move.stockTransferredTeamSuccess} ${selectedItems.length} ${t.move.items.toLowerCase()} (${totalQuantity}) ${t.move.transferSummaryToTeamPrefix} ${destinationTeam.name}.`,
    });
    setSelectedItems([]);
    setNotes("");
    setItemSearch("");
  };

  const handleSubmit = async () => {
    if (!validateBeforeSubmit()) return;

    if (activeTab === "team") {
      setConfirmModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await submitLocationMove();
    } catch {
      showFeedback({
        type: "error",
        title: t.common.error,
        description: t.move.moveError,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmTeamTransfer = async () => {
    setConfirmModalOpen(false);
    setIsSubmitting(true);
    try {
      await submitTeamTransfer();
    } catch {
      showFeedback({
        type: "error",
        title: t.common.error,
        description: t.move.teamTransferError,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TeamLayout team={team} activeMenuItem="move">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-600 mb-1 sm:mb-2">
          {t.move.title}
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-gray-600">
          {t.move.subtitle}
        </p>
      </div>

      <StockOperationFeedback feedback={feedback} />

      <div className="mb-4 sm:mb-6">
        <div className="inline-flex bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setActiveTab("location")}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
              activeTab === "location"
                ? "bg-white text-[#1D4ED8] shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t.move.tabByLocation}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("team");
              if (!destinationTeamId && destinationTeams.length > 0) {
                setDestinationTeamId(destinationTeams[0].id.toString());
              }
            }}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
              activeTab === "team"
                ? "bg-white text-[#1D4ED8] shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t.move.tabByTeam}
          </button>
        </div>
      </div>

      <div className="mb-4 sm:mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label
            htmlFor="sourceLocation"
            className="text-sm font-semibold text-gray-700 mb-2 block"
          >
            {t.move.sourceLocationRequired}
          </Label>
          <select
            id="sourceLocation"
            value={sourceLocation}
            onChange={(event) => setSourceLocation(event.target.value)}
            className={`${formSelectClass} h-11 text-base border-gray-300`}
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id.toString()}>
                {location.name}
              </option>
            ))}
          </select>
        </div>
        {activeTab === "location" ? (
          <div>
            <Label
              htmlFor="destinationLocation"
              className="text-sm font-semibold text-gray-700 mb-2 block"
            >
              {t.move.destinationLocationRequired}
            </Label>
            <select
              id="destinationLocation"
              value={destinationLocation}
              onChange={(event) => setDestinationLocation(event.target.value)}
              className={`${formSelectClass} h-11 text-base border-gray-300`}
            >
              <option value="">{t.move.defaultLocation}</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id.toString()}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <Label
              htmlFor="destinationTeam"
              className="text-sm font-semibold text-gray-700 mb-2 block"
            >
              {t.move.destinationTeamRequired}
            </Label>
            <select
              id="destinationTeam"
              value={destinationTeamId}
              onChange={(event) => setDestinationTeamId(event.target.value)}
              className={`${formSelectClass} h-11 text-base border-gray-300`}
              disabled={!hasDestinationTeams}
            >
              <option value="">{t.move.destinationTeamPlaceholder}</option>
              {destinationTeams.map((destinationTeam) => (
                <option
                  key={destinationTeam.id}
                  value={destinationTeam.id.toString()}
                >
                  {destinationTeam.name}
                </option>
              ))}
            </select>
            {!hasDestinationTeams ? (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-amber-700">
                  {t.move.noActiveDestinationTeams}
                </p>
                <Link
                  to="/"
                  className="inline-flex text-xs text-[#1D4ED8] underline underline-offset-2 hover:text-[#581c87]"
                >
                  {t.move.manageTeamsCta}
                </Link>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <StockItemSearchPanel
        label={t.move.items}
        searchPlaceholder={t.move.searchItem}
        clearFilterLabel={t.common.clearFilter}
        unnamedItemLabel={t.items.unnamedItem}
        currentStockLabel={t.move.currentStockLabel}
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
                  {t.move.item}
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                  {t.move.currentStock}
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                  {t.items.sku}
                </th>
                <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {t.move.quantityToMove}
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
                    {t.move.noItemsSelected}
                  </td>
                </tr>
              ) : (
                selectedItems.map((selectedItem) => {
                  const maxStock = selectedItem.item.currentStock ?? 0;
                  return (
                    <tr
                      key={selectedItem.item.id}
                      className="hover:bg-blue-50/50 transition-colors"
                    >
                      <td className="px-4 sm:px-6 py-4 sm:py-5">
                        <div className="text-sm font-bold text-gray-900">
                          {selectedItem.item.name || t.items.unnamedItem}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 sm:py-5 hidden sm:table-cell text-sm text-gray-900">
                        {maxStock}
                      </td>
                      <td className="px-4 sm:px-6 py-4 sm:py-5 hidden md:table-cell text-sm text-gray-900">
                        {selectedItem.item.sku || "-"}
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
                            className="w-24 h-10 text-center border-gray-300"
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
        <Label
          htmlFor="notes"
          className="text-sm font-semibold text-gray-700 mb-2 block"
        >
          {t.move.notes}
        </Label>
        <Textarea
          id="notes"
          placeholder={t.move.notesPlaceholder}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="min-h-[100px] border-gray-300 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]"
        />
      </div>

      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
        {activeTab === "team" && selectedItems.length > 0 ? (
          <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
            <p className="font-semibold">{t.move.reviewTransferImpact}</p>
            <p className="mt-1">
              {`${team.name} -> ${selectedDestinationTeam?.name || t.move.destinationTeamPlaceholder} | ${selectedItems.length} ${t.move.items.toLowerCase()} | ${totalQuantity}`}
            </p>
          </div>
        ) : null}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-600">{t.move.totalItemsToMove}</p>
            <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
          </div>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={
              isSubmitting ||
              selectedItems.length === 0 ||
              isTeamTransferUnavailable
            }
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 h-auto w-full sm:w-auto"
          >
            {isSubmitting
              ? t.common.loading
              : activeTab === "team"
                ? t.move.transferBetweenTeams
                : t.move.moveStock}
          </Button>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => void handleConfirmTeamTransfer()}
        title={t.move.transferBetweenTeams}
        description={t.move.reviewTransferImpact}
        itemName={selectedDestinationTeam?.name}
        isDeleting={isSubmitting}
        confirmLabel={t.move.transferBetweenTeams}
      />
    </TeamLayout>
  );
}
