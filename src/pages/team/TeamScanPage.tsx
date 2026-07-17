import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import * as api from "@/api/desktop-api";
import { useTranslation } from "@/lib/i18n";
import {
  ScanPageClient,
  type ScanLookupItem,
} from "@/pages/team/scan/ScanPageClient";
import type { ItemDto, TeamDto } from "@/services/types";

function mapItemForScan(item: ItemDto): ScanLookupItem {
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    barcode: item.barcode,
    currentStock: item.currentStock,
    locationName: item.locationName ?? null,
    photoData: item.photoData,
    customFields: item.customFields,
  };
}

export function TeamScanPage() {
  const { teamId = "" } = useParams();
  const { t } = useTranslation();
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [items, setItems] = useState<ScanLookupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const id = Number(teamId);
    void (async () => {
      const teamResult = await api.getTeam(id);
      if (teamResult.ok) setTeam(teamResult.data.team);

      const itemsResult = await api.listTeamItems(id);
      if (itemsResult.ok) {
        setItems(itemsResult.data.items.map(mapItemForScan));
      }

      setIsLoading(false);
    })();
  }, [teamId]);

  if (isLoading || !team) {
    return <div className="p-8">{t.common.loading}</div>;
  }

  return <ScanPageClient team={team} initialItems={items} />;
}