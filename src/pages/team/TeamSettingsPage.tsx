import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import * as api from "@/api/desktop-api";
import { useTranslation } from "@/lib/i18n";
import { SettingsPageClient } from "@/pages/team/settings/SettingsPageClient";
import type { TeamDto } from "@/services/types";

export function TeamSettingsPage() {
  const { teamId = "" } = useParams();
  const { t } = useTranslation();
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    const id = Number(teamId);
    const teamResult = await api.getTeam(id);
    if (teamResult.ok) setTeam(teamResult.data.team);
  }, [teamId]);

  useEffect(() => {
    void (async () => {
      await loadData();
      setIsLoading(false);
    })();
  }, [loadData]);

  if (isLoading || !team) {
    return <div className="p-8">{t.settings.loading}</div>;
  }

  return (
    <SettingsPageClient
      teamId={Number(teamId)}
      team={team}
      onTeamUpdated={setTeam}
      onDataChanged={loadData}
    />
  );
}
