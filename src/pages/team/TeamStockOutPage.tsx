import { useParams } from "react-router-dom";
import { useTranslation } from "@/lib/i18n";
import { useTeamStockData } from "@/pages/team/shared/useTeamStockData";
import { StockOutPageClient } from "@/pages/team/stock-out/StockOutPageClient";

export function TeamStockOutPage() {
  const { teamId = "" } = useParams();
  const { t } = useTranslation();
  const { team, items, locations, isLoading } = useTeamStockData(teamId);

  if (isLoading || !team) {
    return <div className="p-8">{t.common.loading}</div>;
  }

  return (
    <StockOutPageClient team={team} items={items} locations={locations} />
  );
}