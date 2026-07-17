import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import * as api from "@/api/desktop-api";
import { useTranslation } from "@/lib/i18n";
import {
  StockByLocationPageClient,
  type StockByLocationItem,
  type StockByLocationLocation,
} from "@/pages/team/stock-by-location/StockByLocationPageClient";
import type { ItemDto, LocationDto, TeamDto } from "@/services/types";

function mapItemForStockByLocation(item: ItemDto): StockByLocationItem {
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    barcode: item.barcode,
    currentStock: item.currentStock,
    price: item.price,
    locationId: item.locationId,
    locationName: item.locationName ?? null,
  };
}

function mapLocationForStockByLocation(
  location: LocationDto
): StockByLocationLocation {
  return {
    id: location.id,
    name: location.name,
  };
}

export function TeamStockByLocationPage() {
  const { teamId = "" } = useParams();
  const { t } = useTranslation();
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [locations, setLocations] = useState<StockByLocationLocation[]>([]);
  const [items, setItems] = useState<StockByLocationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const id = Number(teamId);
    void (async () => {
      const teamResult = await api.getTeam(id);
      if (teamResult.ok) setTeam(teamResult.data.team);

      const locationsResult = await api.listTeamLocations(id);
      if (locationsResult.ok) {
        setLocations(
          locationsResult.data.locations.map(mapLocationForStockByLocation)
        );
      }

      const itemsResult = await api.listTeamItems(id);
      if (itemsResult.ok) {
        setItems(itemsResult.data.items.map(mapItemForStockByLocation));
      }

      setIsLoading(false);
    })();
  }, [teamId]);

  if (isLoading || !team) {
    return <div className="p-8">{t.common.loading}</div>;
  }

  return (
    <StockByLocationPageClient
      team={team}
      locations={locations}
      items={items}
    />
  );
}