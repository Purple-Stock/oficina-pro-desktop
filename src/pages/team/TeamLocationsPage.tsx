import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Building2, Plus } from "lucide-react";
import * as api from "@/api/desktop-api";
import { LocationsList } from "@/components/locations/LocationsList";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { Button } from "@/components/ui/button";
import { blueGradientIconCircle, purpleGradientButton } from "@/lib/styles";
import { useTranslation } from "@/lib/i18n";
import type { LocationDto, TeamDto } from "@/services/types";

export function TeamLocationsPage() {
  const { teamId = "" } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [locations, setLocations] = useState<LocationDto[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const load = async () => {
    const id = Number(teamId);
    const teamResult = await api.getTeam(id);
    if (teamResult.ok) setTeam(teamResult.data.team);
    const locationsResult = await api.listTeamLocations(id);
    if (locationsResult.ok) setLocations(locationsResult.data.locations);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return locations;
    const query = searchQuery.toLowerCase();
    return locations.filter(
      (location) =>
        location.name.toLowerCase().includes(query) ||
        location.description?.toLowerCase().includes(query)
    );
  }, [locations, searchQuery]);

  const isSearchActive = searchQuery.trim().length > 0;
  const isEmpty = filteredLocations.length === 0;

  const handleDelete = async (locationId: number) => {
    const result = await api.deleteTeamLocation(Number(teamId), locationId);
    if (result.ok) await load();
  };

  if (!team) return <div className="p-8">{t.common.loading}</div>;

  return (
    <TeamLayout team={team} activeMenuItem="locations">
      <PageHeader
        title={t.locations.title}
        subtitle={t.locations.subtitle}
        actions={
          <Link to={`/teams/${teamId}/locations/new`}>
            <Button
              className={`${purpleGradientButton} h-10 sm:h-11 text-xs sm:text-sm`}
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">
                {t.locations.newLocation}
              </span>
              <span className="sm:hidden">{t.locations.newLocationShort}</span>
            </Button>
          </Link>
        }
      />

      <div className="mb-4 sm:mb-6">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t.locations.searchPlaceholder}
        />
      </div>

      {isEmpty ? (
        <EmptyState
          icon={Building2}
          iconClassName={blueGradientIconCircle}
          iconColorClass="text-blue-600"
          title={
            isSearchActive
              ? t.locations.noLocationsSearch
              : t.locations.noLocations
          }
          message={
            isSearchActive
              ? t.locations.noLocationsSearchMessage
              : t.locations.noLocationsMessage
          }
          action={
            !isSearchActive ? (
              <Link to={`/teams/${teamId}/locations/new`}>
                <Button className={`${purpleGradientButton} min-h-[48px]`}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t.locations.createFirstLocation}
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <LocationsList
          locations={filteredLocations}
          labels={{
            name: t.locations.name,
            description: t.locations.description,
            noDescription: t.common.noDescription,
            actions: t.common.actions,
            edit: t.common.edit,
            delete: t.common.delete,
            deleteConfirmPrefix: t.locations.deleteConfirmPrefix,
          }}
          onEdit={(location) =>
            navigate(`/teams/${teamId}/locations/${location.id}/edit`)
          }
          onDelete={handleDelete}
        />
      )}
    </TeamLayout>
  );
}
