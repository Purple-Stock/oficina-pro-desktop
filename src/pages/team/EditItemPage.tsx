import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import * as api from "@/api/desktop-api";
import { ItemForm } from "@/components/items/ItemForm";
import { FormPageShell } from "@/components/shared/FormPageShell";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { Button } from "@/components/ui/button";
import { useEditItemForm } from "@/hooks/useEditItemForm";
import { useTranslation } from "@/lib/i18n";
import { normalizeItemDto } from "@/lib/normalizeItem";
import { formOutlineButton } from "@/lib/styles";
import type { ItemDto, TeamDto } from "@/services/types";

interface EditItemPageContentProps {
  team: TeamDto;
  item: ItemDto;
  teamId: string;
}

function EditItemPageContent({ team, item, teamId }: EditItemPageContentProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
  } = useEditItemForm({
    teamId: team.id,
    itemId: item.id,
    initialItem: item,
    onSuccess: async () => {
      setSuccess(t.itemForm.updateSuccess);
      navigate(`/teams/${teamId}/items`);
    },
  });

  return (
    <TeamLayout team={team} activeMenuItem="items">
      <FormPageShell
        wide
        title={t.items.editItem}
        backHref={`/teams/${teamId}/items`}
        backLabel={t.common.back}
        success={success}
        error={error}
      >
        <ItemForm
          t={t}
          values={form}
          customFieldSchema={team.itemCustomFieldSchema ?? []}
          isLoading={isLoading}
          cancelHref={`/teams/${teamId}/items`}
          mode="edit"
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

export function EditItemPage() {
  const { teamId = "", itemId = "" } = useParams();
  const { t } = useTranslation();
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [item, setItem] = useState<ItemDto | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const id = Number(teamId);
    const selectedItemId = Number(itemId);
    setIsLoading(true);
    setLoadError("");
    setItem(null);

    void (async () => {
      const teamResult = await api.getTeam(id);
      if (!teamResult.ok) {
        setLoadError(t.itemForm.unexpectedError);
        setIsLoading(false);
        return;
      }
      setTeam(teamResult.data.team);

      const itemResult = await api.getTeamItem(id, selectedItemId);
      if (!itemResult.ok) {
        setLoadError(
          itemResult.error.code === "NOT_FOUND"
            ? t.items.itemNotFound
            : itemResult.error.message || t.itemForm.unexpectedError
        );
        setIsLoading(false);
        return;
      }

      setItem(
        normalizeItemDto(
          itemResult.data.item as unknown as Record<string, unknown>
        )
      );
      setIsLoading(false);
    })();
  }, [teamId, itemId, t.itemForm.unexpectedError, t.items.itemNotFound]);

  if (isLoading) return <div className="p-8">{t.common.loading}</div>;

  if (loadError || !team || !item) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-8">
        <div className="mx-auto max-w-lg rounded-xl border border-gray-100 bg-white p-6 shadow-lg">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {t.items.editItem}
          </h1>
          <p className="text-sm text-red-600 mb-6">
            {loadError || t.itemForm.unexpectedError}
          </p>
          <Link to={`/teams/${teamId}/items`}>
            <Button variant="outline" className={formOutlineButton}>
              {t.common.back}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return <EditItemPageContent team={team} item={item} teamId={teamId} />;
}
