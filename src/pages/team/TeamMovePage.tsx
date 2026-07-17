import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import * as api from "@/api/desktop-api";
import { useTranslation } from "@/lib/i18n";
import { useTeamStockData } from "@/pages/team/shared/useTeamStockData";
import { MovePageClient } from "@/pages/team/move/MovePageClient";

export function TeamMovePage() {
  const { teamId = "" } = useParams();
  const { t } = useTranslation();
  const { team, items, locations, isLoading } = useTeamStockData(teamId);
  const [destinationTeams, setDestinationTeams] = useState<
    Array<{ id: number; name: string }>
  >([]);

  useEffect(() => {
    const currentTeamId = Number(teamId);
    void (async () => {
      const teamsResult = await api.listTeams();
      if (!teamsResult.ok) return;
      setDestinationTeams(
        teamsResult.data.teams
          .filter((entry) => entry.id !== currentTeamId)
          .map((entry) => ({ id: entry.id, name: entry.name }))
      );
    })();
  }, [teamId]);

  if (isLoading || !team) {
    return <div className="p-8">{t.common.loading}</div>;
  }

  return (
    <MovePageClient
      team={team}
      items={items}
      locations={locations}
      destinationTeams={destinationTeams}
    />
  );
}
