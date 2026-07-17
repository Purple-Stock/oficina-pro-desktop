import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as api from "@/api/desktop-api";
import { ItemForm } from "@/components/items/ItemForm";
import { FormPageShell } from "@/components/shared/FormPageShell";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { useCreateItemForm } from "@/hooks/useCreateItemForm";
import { useTranslation } from "@/lib/i18n";
import type { LocationDto, TeamDto } from "@/services/types";

export function NewItemPage() {
  const { teamId = "" } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [locations, setLocations] = useState<LocationDto[]>([]);
  const [success, setSuccess] = useState("");

  const {
    form,
    error,
    isLoading,
    updateField,
    updateCustomField,
    generateSKU,
    generateBarcode,
    handleSubmit,
  } = useCreateItemForm({
    teamId: Number(teamId),
    onSuccess: async () => {
      setSuccess(t.itemForm.createSuccess);
      navigate(`/teams/${teamId}/items`);
    },
  });

  useEffect(() => {
    const id = Number(teamId);
    void (async () => {
      const teamResult = await api.getTeam(id);
      if (teamResult.ok) setTeam(teamResult.data.team);
      const locationsResult = await api.listTeamLocations(id);
      if (locationsResult.ok) setLocations(locationsResult.data.locations);
    })();
  }, [teamId]);

  if (!team) return <div className="p-8">{t.common.loading}</div>;

  return (
    <TeamLayout team={team} activeMenuItem="items">
      <FormPageShell
        wide
        title={t.items.newItem}
        backHref={`/teams/${teamId}/items`}
        backLabel={t.common.back}
        success={success}
        error={error}
      >
        <ItemForm
          t={t}
          values={form}
          customFieldSchema={team.itemCustomFieldSchema ?? []}
          locations={locations}
          isLoading={isLoading}
          cancelHref={`/teams/${teamId}/items`}
          mode="create"
          onSubmit={handleSubmit}
          onValueChange={updateField}
          onCustomFieldChange={updateCustomField}
          onGenerateSKU={generateSKU}
          onGenerateBarcode={generateBarcode}
        />
      </FormPageShell>
    </TeamLayout>
  );
}
