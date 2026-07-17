import { Link } from "react-router-dom";
import { FileText, MapPin } from "lucide-react";
import { FormSection } from "@/components/shared/FormSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formOutlineButton, formPrimaryButton } from "@/lib/styles";
import type { useTranslation } from "@/lib/i18n";

interface LocationFormProps {
  t: ReturnType<typeof useTranslation>["t"];
  name: string;
  description: string;
  isLoading: boolean;
  mode: "create" | "edit";
  cancelHref: string;
  onSubmit: (event: React.FormEvent) => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export function LocationForm({
  t,
  name,
  description,
  isLoading,
  mode,
  cancelHref,
  onSubmit,
  onNameChange,
  onDescriptionChange,
}: LocationFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormSection>
        <div className="space-y-2 mb-6">
          <Label htmlFor="name" className="text-gray-900">
            {t.common.name} <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              id="name"
              type="text"
              placeholder={t.locationForm.namePlaceholder}
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              className="w-full pl-10"
              required
              maxLength={255}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-gray-900">
            {t.common.description}
          </Label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Textarea
              id="description"
              placeholder={t.locationForm.descriptionPlaceholder}
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              className="min-h-[100px] pl-10"
              rows={4}
            />
          </div>
        </div>
      </FormSection>

      <div className="flex items-center gap-4 pt-4">
        <Button
          type="submit"
          disabled={isLoading}
          className={formPrimaryButton}
        >
          {mode === "create"
            ? isLoading
              ? t.locationForm.creating
              : t.locationForm.createAction
            : isLoading
              ? t.locationForm.updating
              : t.locationForm.updateAction}
        </Button>
        <Link to={cancelHref}>
          <Button type="button" variant="outline" className={formOutlineButton}>
            {t.common.cancel}
          </Button>
        </Link>
      </div>
    </form>
  );
}
