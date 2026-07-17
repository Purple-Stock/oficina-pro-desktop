import { useEffect } from "react";
import { PackagePlus, X } from "lucide-react";
import { ItemForm } from "@/components/items/ItemForm";
import { Button } from "@/components/ui/button";
import { useCreateItemForm } from "@/hooks/useCreateItemForm";
import { useTranslation } from "@/lib/i18n";
import type { ItemFormValues } from "@/components/items/ItemForm";
import type { ItemDto, TeamDto } from "@/services/types";

type LocationOption = { id: number; name: string };

interface CreateItemInlineModalProps {
  isOpen: boolean;
  team: TeamDto;
  locations: LocationOption[];
  initialValues: Partial<ItemFormValues>;
  onClose: () => void;
  onSuccess: (item: ItemDto) => Promise<void> | void;
}

function CreateItemInlineModalContent({
  team,
  locations,
  initialValues,
  onClose,
  onSuccess,
}: Omit<CreateItemInlineModalProps, "isOpen">) {
  const { t } = useTranslation();
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
    teamId: team.id,
    initialValues,
    onSuccess,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-item-inline-modal-title"
      >
        <div className="bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-xl sm:rounded-t-2xl">
          <div className="flex items-center gap-3">
            <PackagePlus className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            <div>
              <h2
                id="create-item-inline-modal-title"
                className="text-lg sm:text-xl font-bold text-white"
              >
                {t.stockIn.createItemModalTitle}
              </h2>
              <p className="text-xs sm:text-sm text-blue-100">
                {t.stockIn.createItemModalDescription}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label={t.common.close}
            className="text-white hover:bg-white/20 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 sm:p-6">
          {error ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <ItemForm
            t={t}
            values={form}
            customFieldSchema={team.itemCustomFieldSchema ?? []}
            locations={locations}
            isLoading={isLoading}
            mode="create"
            onSubmit={handleSubmit}
            onValueChange={updateField}
            onCustomFieldChange={updateCustomField}
            onGenerateSKU={generateSKU}
            onGenerateBarcode={generateBarcode}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}

export function CreateItemInlineModal({
  isOpen,
  team,
  locations,
  initialValues,
  onClose,
  onSuccess,
}: CreateItemInlineModalProps) {
  if (!isOpen) return null;

  return (
    <CreateItemInlineModalContent
      key={JSON.stringify(initialValues)}
      team={team}
      locations={locations}
      initialValues={initialValues}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
