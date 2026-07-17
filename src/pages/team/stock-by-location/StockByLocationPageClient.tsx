import { useMemo, useState } from "react";
import { MapPin, Package, Search } from "lucide-react";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import type { TeamDto } from "@/services/types";

export type StockByLocationItem = {
  id: number;
  name: string | null;
  sku: string | null;
  barcode: string | null;
  currentStock: number | null;
  price: number | null;
  locationId: number | null;
  locationName?: string | null;
};

export type StockByLocationLocation = {
  id: number;
  name: string;
};

type LocationStock = {
  location: StockByLocationLocation;
  items: StockByLocationItem[];
  totalStock: number;
  totalItems: number;
};

interface StockByLocationPageClientProps {
  team: TeamDto;
  locations: StockByLocationLocation[];
  items: StockByLocationItem[];
}

export function StockByLocationPageClient({
  team,
  locations,
  items,
}: StockByLocationPageClientProps) {
  const { language, t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  const formatPrice = (price: number | null) => {
    if (!price) return "-";
    const locale =
      language === "en" ? "en-US" : language === "fr" ? "fr-FR" : "pt-BR";
    const currency =
      language === "en" ? "USD" : language === "fr" ? "EUR" : "BRL";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(price);
  };

  const stockByLocation = useMemo((): LocationStock[] => {
    let filteredItems = items;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredItems = items.filter(
        (item) =>
          item.name?.toLowerCase().includes(query) ||
          item.sku?.toLowerCase().includes(query) ||
          item.barcode?.toLowerCase().includes(query) ||
          item.locationName?.toLowerCase().includes(query)
      );
    }

    const locationMap = new Map<number, LocationStock>();

    locations.forEach((location) => {
      locationMap.set(location.id, {
        location,
        items: [],
        totalStock: 0,
        totalItems: 0,
      });
    });

    const defaultLocationStock: LocationStock = {
      location: { id: 0, name: t.stockByLocation.defaultLocation },
      items: [],
      totalStock: 0,
      totalItems: 0,
    };

    filteredItems.forEach((item) => {
      if (item.locationId && locationMap.has(item.locationId)) {
        const locationStock = locationMap.get(item.locationId)!;
        locationStock.items.push(item);
        locationStock.totalStock += item.currentStock || 0;
        locationStock.totalItems += 1;
      } else {
        defaultLocationStock.items.push(item);
        defaultLocationStock.totalStock += item.currentStock || 0;
        defaultLocationStock.totalItems += 1;
      }
    });

    const result = Array.from(locationMap.values());
    if (defaultLocationStock.items.length > 0 || searchQuery) {
      result.push(defaultLocationStock);
    }

    if (searchQuery) {
      return result.filter((locationStock) => locationStock.items.length > 0);
    }

    return result;
  }, [items, locations, searchQuery, t.stockByLocation.defaultLocation]);

  return (
    <TeamLayout team={team} activeMenuItem="stock-by-location">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1D4ED8] mb-1 sm:mb-2">
          {t.stockByLocation.title}
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-gray-600">
          {t.stockByLocation.subtitle}
        </p>
      </div>

      <div className="mb-4 sm:mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          <Input
            type="text"
            placeholder={t.stockByLocation.searchPlaceholder}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-9 sm:pl-10 h-11 text-base border-gray-300 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]"
          />
        </div>
      </div>

      {stockByLocation.length === 0 ? (
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium mb-2">
            {searchQuery
              ? t.stockByLocation.noItemsSearch
              : t.stockByLocation.noLocations}
          </p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {stockByLocation.map((locationStock) => (
            <div
              key={locationStock.location.id}
              className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-slate-50 to-blue-100 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#1D4ED8] to-[#2563EB] rounded-lg sm:rounded-xl flex items-center justify-center shadow-md">
                    <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                      {locationStock.location.name}
                    </h2>
                    <div className="flex flex-wrap gap-3 sm:gap-4 mt-1">
                      <span className="text-xs sm:text-sm text-gray-600">
                        {t.stockByLocation.totalItems}:{" "}
                        <span className="font-semibold text-gray-900">
                          {locationStock.totalItems}
                        </span>
                      </span>
                      <span className="text-xs sm:text-sm text-gray-600">
                        {t.stockByLocation.totalStock}:{" "}
                        <span className="font-semibold text-gray-900">
                          {locationStock.totalStock.toFixed(1)}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {locationStock.items.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {t.stockByLocation.noItems}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          {t.stockByLocation.item}
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                          {t.stockByLocation.sku}
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                          {t.stockByLocation.stock}
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                          {t.stockByLocation.price}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {locationStock.items.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-blue-50/50 transition-colors"
                        >
                          <td className="px-4 sm:px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {item.name || t.items.unnamedItem}
                            </div>
                            <div className="text-xs text-gray-500 sm:hidden mt-1">
                              {item.sku ? `SKU: ${item.sku}` : null}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 hidden sm:table-cell">
                            {item.sku || "-"}
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                              {item.currentStock || 0}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                            {formatPrice(item.price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </TeamLayout>
  );
}
