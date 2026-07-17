import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as api from "@/api/desktop-api";
import { LocationForm } from "@/components/locations/LocationForm";
import { FormPageShell } from "@/components/shared/FormPageShell";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { useTranslation } from "@/lib/i18n";
import type { TeamDto } from "@/services/types";

export function EditLocationPage() {
  const { teamId = "", locationId = "" } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const id = Number(teamId);
    void (async () => {
      const teamResult = await api.getTeam(id);
      if (teamResult.ok) setTeam(teamResult.data.team);
      const locationsResult = await api.listTeamLocations(id);
      if (locationsResult.ok) {
        const location = locationsResult.data.locations.find(
          (entry) => entry.id === Number(locationId)
        );
        if (location) {
          setName(location.name);
          setDescription(location.description ?? "");
        }
      }
    })();
  }, [teamId, locationId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError(t.locationForm.nameRequired);
      return;
    }

    setIsLoading(true);
    const result = await api.updateTeamLocation(
      Number(teamId),
      Number(locationId),
      {
        name: name.trim(),
        description: description.trim() || null,
      }
    );
    setIsLoading(false);

    if (!result.ok) {
      setError(result.error.message || t.locationForm.unexpectedError);
      return;
    }

    setSuccess(t.locationForm.updateSuccess);
    navigate(`/teams/${teamId}/locations`);
  };

  if (!team) return <div className="p-8">{t.common.loading}</div>;

  return (
    <TeamLayout team={team} activeMenuItem="locations">
      <FormPageShell
        title={t.locations.editLocation}
        backHref={`/teams/${teamId}/locations`}
        backLabel={t.common.back}
        success={success}
        error={error}
      >
        <LocationForm
          t={t}
          name={name}
          description={description}
          isLoading={isLoading}
          mode="edit"
          cancelHref={`/teams/${teamId}/locations`}
          onSubmit={handleSubmit}
          onNameChange={setName}
          onDescriptionChange={setDescription}
        />
      </FormPageShell>
    </TeamLayout>
  );
}
