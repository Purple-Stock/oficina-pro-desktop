import { Link } from "react-router-dom";
import { FileText, Users } from "lucide-react";
import { FormSection } from "@/components/shared/FormSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formOutlineButton, formPrimaryButton } from "@/lib/styles";
import type { useTranslation } from "@/lib/i18n";

interface TeamFormProps {
  t: ReturnType<typeof useTranslation>["t"];
  name: string;
  notes: string;
  isLoading: boolean;
  mode: "create" | "edit";
  cancelHref?: string;
  onCancel?: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onNameChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}

export function TeamForm({
  t,
  name,
  notes,
  isLoading,
  mode,
  cancelHref,
  onCancel,
  onSubmit,
  onNameChange,
  onNotesChange,
}: TeamFormProps) {
  const submitLabel =
    mode === "create"
      ? isLoading
        ? t.team.creating
        : t.team.createAction
      : isLoading
        ? t.team.updating
        : t.team.updateAction;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormSection>
        <div className="space-y-2 mb-6">
          <Label htmlFor="team-name" className="text-gray-900">
            {t.teams.teamName} <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              id="team-name"
              type="text"
              placeholder={t.team.teamNamePlaceholder}
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              className="w-full pl-10"
              required
              maxLength={255}
            />
          </div>
          <p className="text-xs text-gray-500">{t.team.teamNameHint}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="team-notes" className="text-gray-900">
            {t.team.notesOptional}
          </Label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Textarea
              id="team-notes"
              placeholder={t.team.notesPlaceholder}
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              className="min-h-[100px] pl-10"
              rows={4}
            />
          </div>
          <p className="text-xs text-gray-500">{t.team.notesHint}</p>
        </div>
      </FormSection>

      <div className="flex items-center gap-4 pt-4">
        <Button
          type="submit"
          disabled={isLoading}
          className={formPrimaryButton}
        >
          {submitLabel}
        </Button>
        {cancelHref ? (
          <Link to={cancelHref}>
            <Button
              type="button"
              variant="outline"
              className={formOutlineButton}
            >
              {t.common.cancel}
            </Button>
          </Link>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className={formOutlineButton}
          >
            {t.common.cancel}
          </Button>
        )}
      </div>
    </form>
  );
}
