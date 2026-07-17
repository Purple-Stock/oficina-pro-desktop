import { useEffect, useState } from "react";
import { X } from "lucide-react";
import * as api from "@/api/desktop-api";
import { TeamForm } from "@/components/teams/TeamForm";
import { useTranslation } from "@/lib/i18n";
import type { TeamDto } from "@/services/types";

interface EditTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: TeamDto | null;
  onSuccess: () => void;
}

export function EditTeamModal({
  isOpen,
  onClose,
  team,
  onSuccess,
}: EditTeamModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (team) {
      setName(team.name);
      setNotes(team.notes ?? "");
    }
  }, [team]);

  if (!isOpen || !team) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    const result = await api.updateTeam(team.id, {
      name: name.trim(),
      notes: notes.trim() || null,
    });
    setIsSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg border border-gray-100">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {t.teamSelection.editTeam}
          </h2>
          <button type="button" onClick={onClose} aria-label={t.common.close}>
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <TeamForm
          t={t}
          name={name}
          notes={notes}
          isLoading={isSaving}
          mode="edit"
          onCancel={onClose}
          onSubmit={handleSubmit}
          onNameChange={setName}
          onNotesChange={setNotes}
        />
      </div>
    </div>
  );
}
