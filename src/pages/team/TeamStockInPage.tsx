import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import * as api from "@/api/desktop-api";
import { useTranslation } from "@/lib/i18n";
import { StockInPageClient } from "@/pages/team/stock-in/StockInPageClient";
import type {
  StockInItem,
  StockInLocation,
} from "@/pages/team/stock-in/types";
import type { TeamDto } from "@/services/types";

export function TeamStockInPage() {
  const { teamId = "" } = useParams();
  const { t } = useTranslation();
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [items, setItems] = useState<StockInItem[]>([]);
  const [locations, setLocations] = useState<StockInLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const id = Number(teamId);
    void (async () => {
      const teamResult = await api.getTeam(id);
      if (teamResult.ok) setTeam(teamResult.data.team);

      const itemsResult = await api.listTeamItems(id);
      if (itemsResult.ok) {
        setItems(
          itemsResult.data.items.map((item) => ({
            id: item.id,
            name: item.name,
            sku: item.sku,
            barcode: item.barcode,
            currentStock: item.currentStock,
            locationName: item.locationName,
          }))
        );
      }

      const locationsResult = await api.listTeamLocations(id);
      if (locationsResult.ok) {
        setLocations(
          locationsResult.data.locations.map((location) => ({
            id: location.id,
            name: location.name,
          }))
        );
      }

      setIsLoading(false);
    })();
  }, [teamId]);

  if (isLoading || !team) {
    return <div className="p-8">{t.common.loading}</div>;
  }

  return (
    <StockInPageClient
      team={team}
      items={items}
      locations={locations}
      onItemsChange={setItems}
    />
  );
}