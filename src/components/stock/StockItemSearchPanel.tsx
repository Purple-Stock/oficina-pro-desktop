import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StockOperationItem } from "@/pages/team/shared/stock-operation-types";

interface StockItemSearchPanelProps {
  id?: string;
  label: string;
  searchPlaceholder: string;
  clearFilterLabel: string;
  unnamedItemLabel: string;
  currentStockLabel: string;
  itemSearch: string;
  filteredItems: StockOperationItem[];
  hasItemFilters: boolean;
  onItemSearchChange: (value: string) => void;
  onClear: () => void;
  onAddItem: (item: StockOperationItem) => void;
  showCurrentStock?: boolean;
  children?: React.ReactNode;
}

export function StockItemSearchPanel({
  id = "items",
  label,
  searchPlaceholder,
  clearFilterLabel,
  unnamedItemLabel,
  currentStockLabel,
  itemSearch,
  filteredItems,
  hasItemFilters,
  onItemSearchChange,
  onClear,
  onAddItem,
  showCurrentStock = true,
  children,
}: StockItemSearchPanelProps) {
  return (
    <div className="mb-4 sm:mb-6">
      <Label
        htmlFor={id}
        className="text-sm font-semibold text-gray-700 mb-2 block"
      >
        {label}
      </Label>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          <Input
            id={id}
            type="text"
            placeholder={searchPlaceholder}
            value={itemSearch}
            onChange={(event) => onItemSearchChange(event.target.value)}
            className="pl-9 sm:pl-10 h-11 text-base border-gray-300 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]"
          />
          {hasItemFilters && filteredItems.length > 0 ? (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onAddItem(item)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-gray-900">
                    {item.name || unnamedItemLabel}
                  </div>
                  {item.sku ? (
                    <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                  ) : null}
                  {showCurrentStock && item.currentStock !== null ? (
                    <div className="text-xs text-gray-500">
                      {currentStockLabel}: {item.currentStock}
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
          onClick={onClear}
          className="border-gray-300 text-gray-700 hover:bg-gray-50 h-11"
        >
          {clearFilterLabel}
        </Button>
      </div>
      {children}
    </div>
  );
}
