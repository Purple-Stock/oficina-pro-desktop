import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import * as api from "@/api/desktop-api";
import { useTranslation } from "@/lib/i18n";
import { ReportsPageClient } from "@/pages/team/reports/ReportsPageClient";
import type { ReportStatsDto, TeamDto } from "@/services/types";

const emptyStats: ReportStatsDto = {
  totalItems: 0,
  totalLocations: 0,
  totalTransactions: 0,
  totalStockValue: 0,
  lowStockItems: 0,
  outOfStockItems: 0,
  transactionsByType: {
    stock_in: 0,
    stock_out: 0,
    adjust: 0,
    move: 0,
  },
  recentTransactions: [],
  topItemsByValue: [],
  stockByLocation: [],
  transactionsByDate: [],
};

export function TeamReportsPage() {
  const { teamId = "" } = useParams();
  const { t } = useTranslation();
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [stats, setStats] = useState<ReportStatsDto>(emptyStats);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const id = Number(teamId);
    void (async () => {
      const teamResult = await api.getTeam(id);
      if (teamResult.ok) {
        setTeam(teamResult.data.team);
      }

      const statsResult = await api.getTeamReportStats(id);
      if (statsResult.ok) {
        setStats(statsResult.data.stats);
      }

      setIsLoading(false);
    })();
  }, [teamId]);

  if (isLoading || !team) {
    return <div className="p-8">{t.reports.loading}</div>;
  }

  return (
    <ReportsPageClient
      teamId={Number(teamId)}
      team={team}
      initialStats={stats}
    />
  );
}
