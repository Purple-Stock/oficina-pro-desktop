import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Construction } from "lucide-react";
import * as api from "@/api/desktop-api";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { purpleGradientIconCircle } from "@/lib/styles";
import { useTranslation } from "@/lib/i18n";
import type { TeamDto } from "@/services/types";

interface TeamPlaceholderPageProps {
  activeMenuItem: string;
  titleKey: keyof ReturnType<typeof useTranslation>["t"]["stock"];
}

function getSubtitleKey(
  titleKey: TeamPlaceholderPageProps["titleKey"]
): keyof ReturnType<typeof useTranslation>["t"]["stock"] | null {
  const map: Partial<
    Record<
      TeamPlaceholderPageProps["titleKey"],
      keyof ReturnType<typeof useTranslation>["t"]["stock"]
    >
  > = {
    scanTitle: "scanSubtitle",
    stockByLocationTitle: "stockByLocationSubtitle",
    labelsTitle: "labelsSubtitle",
    reportsTitle: "reportsSubtitle",
    settingsTitle: "settingsSubtitle",
  };
  return map[titleKey] ?? null;
}

export function TeamPlaceholderPage({
  activeMenuItem,
  titleKey,
}: TeamPlaceholderPageProps) {
  const { teamId = "" } = useParams();
  const { t } = useTranslation();
  const [team, setTeam] = useState<TeamDto | null>(null);

  useEffect(() => {
    void api.getTeam(Number(teamId)).then((result) => {
      if (result.ok) setTeam(result.data.team);
    });
  }, [teamId]);

  const subtitleKey = getSubtitleKey(titleKey);

  if (!team) return <div className="p-8">{t.common.loading}</div>;

  return (
    <TeamLayout team={team} activeMenuItem={activeMenuItem}>
      <PageHeader
        title={t.stock[titleKey]}
        subtitle={subtitleKey ? t.stock[subtitleKey] : undefined}
      />
      <EmptyState
        icon={Construction}
        iconClassName={purpleGradientIconCircle}
        title={t.common.comingSoon}
        message={t.common.comingSoonMessage}
      />
    </TeamLayout>
  );
}
