import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import * as api from "@/api/desktop-api";
import { useTranslation } from "@/lib/i18n";
import {
  LabelsPageClient,
  type LabelItem,
} from "@/pages/team/labels/LabelsPageClient";
import type { ItemDto, TeamDto } from "@/services/types";

function mapItemForLabels(item: ItemDto): LabelItem {
  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    barcode: item.barcode,
    currentStock: item.currentStock,
    price: item.price,
    locationName: item.locationName ?? null,
    customFields: item.customFields,
  };
}

export function TeamLabelsPage() {
  const { teamId = "" } = useParams();
  const { t } = useTranslation();
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [items, setItems] = useState<LabelItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const id = Number(teamId);
    void (async () => {
      const teamResult = await api.getTeam(id);
      if (teamResult.ok) setTeam(teamResult.data.team);

      const itemsResult = await api.listTeamItems(id);
      if (itemsResult.ok) {
        setItems(itemsResult.data.items.map(mapItemForLabels));
      }

      setIsLoading(false);
    })();
  }, [teamId]);

  if (isLoading || !team) {
    return <div className="p-8">{t.common.loading}</div>;
  }

  return <LabelsPageClient team={team} items={items} />;
}