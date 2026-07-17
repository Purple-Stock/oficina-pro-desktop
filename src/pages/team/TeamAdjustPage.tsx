import { useParams } from "react-router-dom";
import { useTranslation } from "@/lib/i18n";
import { useTeamStockData } from "@/pages/team/shared/useTeamStockData";
import { AdjustPageClient } from "@/pages/team/adjust/AdjustPageClient";

export function TeamAdjustPage() {
  const { teamId = "" } = useParams();
  const { t } = useTranslation();
  const { team, items, locations, isLoading } = useTeamStockData(teamId);

  if (isLoading || !team) {
    return <div className="p-8">{t.common.loading}</div>;
  }

  return <AdjustPageClient team={team} items={items} locations={locations} />;
}