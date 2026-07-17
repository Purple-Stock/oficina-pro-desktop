import { useEffect, useState } from "react";
import * as api from "@/api/desktop-api";
import {
  mapItemForStockOperation,
  mapLocationForStockOperation,
  type StockOperationItem,
  type StockOperationLocation,
} from "@/pages/team/shared/stock-operation-types";
import type { TeamDto } from "@/services/types";

export function useTeamStockData(teamId: string) {
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [items, setItems] = useState<StockOperationItem[]>([]);
  const [locations, setLocations] = useState<StockOperationLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const id = Number(teamId);
    void (async () => {
      const teamResult = await api.getTeam(id);
      if (teamResult.ok) setTeam(teamResult.data.team);

      const itemsResult = await api.listTeamItems(id);
      if (itemsResult.ok) {
        setItems(itemsResult.data.items.map(mapItemForStockOperation));
      }

      const locationsResult = await api.listTeamLocations(id);
      if (locationsResult.ok) {
        setLocations(
          locationsResult.data.locations.map(mapLocationForStockOperation)
        );
      }

      setIsLoading(false);
    })();
  }, [teamId]);

  return { team, items, locations, isLoading, setItems };
}
