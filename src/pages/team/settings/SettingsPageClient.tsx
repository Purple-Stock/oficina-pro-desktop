import { useMemo, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Download, FileUp, Plus, Trash2, Upload } from "lucide-react";
import * as api from "@/api/desktop-api";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  downloadCsv,
  getItemsCsvTemplate,
} from "@/lib/items/export-items-csv";
import {
  openLabelsPdfFile,
  revealLabelsPdfInDir,
  type SavedLabelsPdf,
} from "@/lib/labels/save-labels-pdf-file";
import { useTranslation } from "@/lib/i18n";
import type {
  ItemCsvImportPreview,
  TeamBackupImportSummary,
  TeamDto,
} from "@/services/types";
import type { TeamItemCustomFieldSchemaEntry } from "@/db/types";

type SettingsTab = "general" | "labels" | "customFields" | "data";

type CustomFieldRow = TeamItemCustomFieldSchemaEntry & { isExisting: boolean };

interface SettingsPageClientProps {
  teamId: number;
  team: TeamDto;
  onTeamUpdated: (team: TeamDto) => void;
  onDataChanged: () => Promise<void>;
}

function buildGeneralExportFilename(): string {
  return `oficina-pro-export-${new Date().toISOString().split("T")[0]}.json`;
}

export function SettingsPageClient({
  teamId,
  team,
  onTeamUpdated,
  onDataChanged,
}: SettingsPageClientProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [teamName, setTeamName] = useState(team.name);
  const [notes, setNotes] = useState(team.notes ?? "");
  const [labelCompanyInfo, setLabelCompanyInfo] = useState(
    team.labelCompanyInfo ?? ""
  );
  const [labelLogoUrl, setLabelLogoUrl] = useState(team.labelLogoUrl ?? "");
  const [customFields, setCustomFields] = useState<CustomFieldRow[]>(
    (team.itemCustomFieldSchema ?? []).map((entry) => ({
      ...entry,
      isExisting: true,
    }))
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedFile, setSavedFile] = useState<SavedLabelsPdf | null>(null);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvContent, setCsvContent] = useState("");
  const [csvPreview, setCsvPreview] = useState<ItemCsvImportPreview | null>(
    null
  );
  const [isCsvPreviewing, setIsCsvPreviewing] = useState(false);
  const [isCsvImporting, setIsCsvImporting] = useState(false);
  const [isBackupImporting, setIsBackupImporting] = useState(false);
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const canImportCsv = useMemo(
    () =>
      Boolean(
        csvPreview &&
          csvPreview.summary.totalRows > 0 &&
          csvPreview.summary.invalidRows === 0
      ),
    [csvPreview]
  );

  const showSuccess = (message: string) => {
    setFeedback(message);
    setError(null);
  };

  const showFailure = (message: string) => {
    setError(message);
    setFeedback(null);
  };

  const handleSaveGeneral = async () => {
    if (!teamName.trim()) {
      showFailure(t.settings.teamNameRequired);
      return;
    }
    setIsSaving(true);
    const result = await api.updateTeam(teamId, {
      name: teamName.trim(),
      notes: notes.trim() || null,
    });
    setIsSaving(false);
    if (!result.ok) {
      showFailure(result.error.message);
      return;
    }
    onTeamUpdated(result.data.team);
    showSuccess(t.settings.changesSaved);
  };

  const handleSaveLabels = async () => {
    setIsSaving(true);
    const result = await api.updateTeam(teamId, {
      labelCompanyInfo: labelCompanyInfo.trim() || null,
      labelLogoUrl: labelLogoUrl.trim() || null,
    });
    setIsSaving(false);
    if (!result.ok) {
      showFailure(result.error.message);
      return;
    }
    onTeamUpdated(result.data.team);
    showSuccess(t.settings.changesSaved);
  };

  const handleLabelLogoFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") resolve(reader.result);
          else reject(new Error("Invalid file content"));
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
      setLabelLogoUrl(dataUrl);
    } catch {
      showFailure(t.settings.errorSaving);
    } finally {
      event.target.value = "";
    }
  };

  const handleSaveCustomFields = async () => {
    const normalized = customFields.map((entry) => ({
      key: entry.key.trim(),
      label: entry.label.trim(),
      active: entry.active,
    }));
    if (normalized.some((entry) => !entry.key || !entry.label)) {
      showFailure(t.settings.customFieldRequired);
      return;
    }
    if (new Set(normalized.map((entry) => entry.key)).size !== normalized.length) {
      showFailure(t.settings.customFieldDuplicate);
      return;
    }

    setIsSaving(true);
    const result = await api.updateTeam(teamId, {
      itemCustomFieldSchema: normalized,
    });
    setIsSaving(false);
    if (!result.ok) {
      showFailure(result.error.message);
      return;
    }
    onTeamUpdated(result.data.team);
    setCustomFields(
      (result.data.team.itemCustomFieldSchema ?? []).map((entry) => ({
        ...entry,
        isExisting: true,
      }))
    );
    showSuccess(t.settings.customFieldSchemaSaved);
  };

  const handleDeleteAllConfirm = async () => {
    setIsDeletingAll(true);
    const result = await api.deleteAllData();
    setIsDeletingAll(false);
    if (!result.ok) {
      showFailure(result.error.message);
      return;
    }
    setDeleteAllModalOpen(false);
    navigate("/");
  };

  const handleExportGeneralJson = async () => {
    setSavedFile(null);
    const result = await api.exportFullBackup(buildGeneralExportFilename());
    if (!result.ok) {
      showFailure(result.error.message);
      return;
    }
    setSavedFile(result.data);
    showSuccess(t.settings.exportGeneralSuccess);
  };

  const handleBackupFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsBackupImporting(true);
    try {
      const jsonContent = await file.text();
      const result = await api.importTeamBackup(teamId, jsonContent);
      if (!result.ok) {
        showFailure(result.error.message);
        return;
      }
      await onDataChanged();
      showBackupImportSummary(result.data);
    } catch {
      showFailure(t.settings.errorSaving);
    } finally {
      setIsBackupImporting(false);
      event.target.value = "";
    }
  };

  const showBackupImportSummary = (summary: TeamBackupImportSummary) => {
    showSuccess(
      t.settings.backupImportSummary
        .replace("{locations}", String(summary.importedLocations))
        .replace("{items}", String(summary.importedItems))
        .replace("{skippedItems}", String(summary.skippedItems))
    );
  };

  const handleCsvFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setCsvFileName("");
      setCsvContent("");
      setCsvPreview(null);
      return;
    }
    setCsvFileName(file.name);
    setCsvContent(await file.text());
    setCsvPreview(null);
  };

  const handlePreviewCsv = async () => {
    if (!csvContent.trim()) {
      showFailure(t.settings.importCsvNoPreview);
      return;
    }
    setIsCsvPreviewing(true);
    const result = await api.previewTeamItemsCsv(teamId, csvContent);
    setIsCsvPreviewing(false);
    if (!result.ok) {
      showFailure(result.error.message);
      return;
    }
    setCsvPreview(result.data);
    setError(null);
  };

  const handleImportCsv = async () => {
    if (!canImportCsv) {
      showFailure(t.settings.importCsvBlocked);
      return;
    }
    setIsCsvImporting(true);
    const result = await api.importTeamItemsCsv(teamId, csvContent);
    setIsCsvImporting(false);
    if (!result.ok) {
      showFailure(result.error.message);
      return;
    }
    await onDataChanged();
    setCsvPreview(null);
    setCsvContent("");
    setCsvFileName("");
    showSuccess(t.settings.importCsvSuccess);
  };

  const tabs: Array<{ id: SettingsTab; label: string }> = [
    { id: "general", label: t.settings.generalTab },
    { id: "labels", label: t.settings.labelsTab },
    { id: "customFields", label: t.settings.customFieldsTab },
    { id: "data", label: t.settings.dataTab },
  ];

  return (
    <TeamLayout team={team} activeMenuItem="settings">
      <main className="p-4 sm:p-6 md:p-8">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1D4ED8] mb-1 sm:mb-2">
            {t.settings.title}
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            {t.settings.subtitle}
          </p>
        </div>

        {feedback ? (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {feedback}
          </div>
        ) : null}
        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <div className="mb-4 sm:mb-6 border-b border-gray-200">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-[#1D4ED8] text-[#1D4ED8]"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "general" ? (
          <section className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {t.settings.teamInformation}
            </h2>
            <div className="grid gap-4 max-w-xl">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t.settings.teamName}
                </label>
                <Input
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  placeholder={t.settings.teamNamePlaceholder}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t.settings.notes}
                </label>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={t.settings.notesPlaceholder}
                  rows={4}
                />
              </div>
              <Button
                type="button"
                onClick={() => void handleSaveGeneral()}
                disabled={isSaving}
                className="w-fit bg-[#1D4ED8] hover:bg-[#2563EB]"
              >
                {isSaving ? t.settings.modalSaving : t.settings.saveChanges}
              </Button>
            </div>
          </section>
        ) : null}

        {activeTab === "labels" ? (
          <section className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              {t.settings.labelCompanyInfoTitle}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {t.settings.labelCompanyInfoDesc}
            </p>
            <div className="grid gap-4 max-w-xl">
              <Input
                value={labelCompanyInfo}
                onChange={(event) => setLabelCompanyInfo(event.target.value)}
                placeholder={t.settings.labelCompanyInfoPlaceholder}
              />
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {t.settings.labelLogoTitle}
                </p>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handleLabelLogoFileChange(event)}
                />
                {labelLogoUrl ? (
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={labelLogoUrl}
                      alt={t.settings.labelLogoTitle}
                      className="h-16 w-16 object-contain rounded border border-gray-200 bg-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLabelLogoUrl("")}
                    >
                      {t.settings.removeLabelLogo}
                    </Button>
                  </div>
                ) : null}
              </div>
              <Button
                type="button"
                onClick={() => void handleSaveLabels()}
                disabled={isSaving}
                className="w-fit bg-[#1D4ED8] hover:bg-[#2563EB]"
              >
                {isSaving ? t.settings.modalSaving : t.settings.saveChanges}
              </Button>
            </div>
          </section>
        ) : null}

        {activeTab === "customFields" ? (
          <section className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {t.settings.customFieldsTitle}
                </h2>
                <p className="text-sm text-gray-600">
                  {t.settings.customFieldsSubtitle}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setCustomFields((prev) => [
                    ...prev,
                    { key: "", label: "", active: true, isExisting: false },
                  ])
                }
              >
                <Plus className="h-4 w-4 mr-1" />
                {t.settings.addCustomField}
              </Button>
            </div>
            <div className="space-y-2">
              {customFields.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {t.settings.noCustomFields}
                </p>
              ) : (
                customFields.map((field, index) => (
                  <div
                    key={`custom-field-${index}`}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                  >
                    <Input
                      value={field.key}
                      onChange={(event) =>
                        setCustomFields((prev) =>
                          prev.map((row, rowIndex) =>
                            rowIndex === index
                              ? { ...row, key: event.target.value }
                              : row
                          )
                        )
                      }
                      placeholder={t.settings.customFieldKeyPlaceholder}
                      className="sm:col-span-4"
                      disabled={field.isExisting}
                    />
                    <Input
                      value={field.label}
                      onChange={(event) =>
                        setCustomFields((prev) =>
                          prev.map((row, rowIndex) =>
                            rowIndex === index
                              ? { ...row, label: event.target.value }
                              : row
                          )
                        )
                      }
                      placeholder={t.settings.customFieldLabelPlaceholder}
                      className="sm:col-span-5"
                    />
                    <label className="sm:col-span-2 flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={field.active}
                        onChange={(event) =>
                          setCustomFields((prev) =>
                            prev.map((row, rowIndex) =>
                              rowIndex === index
                                ? { ...row, active: event.target.checked }
                                : row
                            )
                          )
                        }
                      />
                      {t.settings.customFieldActive}
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      className="sm:col-span-1 border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() =>
                        setCustomFields((prev) =>
                          prev.filter((_, rowIndex) => rowIndex !== index)
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
            <Button
              type="button"
              onClick={() => void handleSaveCustomFields()}
              disabled={isSaving}
              className="mt-4 bg-[#1D4ED8] hover:bg-[#2563EB]"
            >
              {isSaving ? t.settings.modalSaving : t.settings.saveCustomFieldSchema}
            </Button>
          </section>
        ) : null}

        {activeTab === "data" ? (
          <div className="space-y-4 sm:space-y-6">
            <section className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                {t.settings.exportGeneralTitle}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                {t.settings.exportGeneralDescription}
              </p>
              <Button
                type="button"
                onClick={() => void handleExportGeneralJson()}
                className="bg-[#1D4ED8] hover:bg-[#2563EB]"
              >
                <Download className="h-4 w-4 mr-2" />
                {t.settings.exportGeneralButton}
              </Button>
              {savedFile ? (
                <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-3">
                  <p className="text-xs text-gray-600">{t.settings.savedTo}</p>
                  <p className="text-sm font-medium break-all">
                    {savedFile.filePath}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void openLabelsPdfFile(savedFile)}
                    >
                      {t.settings.openFile}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void revealLabelsPdfInDir(savedFile)}
                    >
                      {t.settings.showInFolder}
                    </Button>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                {t.settings.importGeneralTitle}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                {t.settings.importGeneralDescription}
              </p>
              <label className="inline-flex items-center gap-2 px-4 py-2 border border-input rounded-md cursor-pointer text-sm font-medium hover:bg-accent">
                <Upload className="h-4 w-4" />
                {t.settings.selectBackupFile}
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(event) => void handleBackupFileChange(event)}
                  disabled={isBackupImporting}
                />
              </label>
            </section>

            <section className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                {t.settings.importCsvTitle}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                {t.settings.importCsvDescription}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    downloadCsv(getItemsCsvTemplate(), "items-import-template.csv")
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t.settings.importCsvTemplate}
                </Button>
                <label className="inline-flex items-center gap-2 px-4 py-2 border border-input rounded-md cursor-pointer text-sm font-medium hover:bg-accent">
                  <FileUp className="h-4 w-4" />
                  {t.settings.importCsvSelectFile}
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(event) => void handleCsvFileChange(event)}
                  />
                </label>
              </div>
              {csvFileName ? (
                <p className="text-sm text-gray-700 mb-4">
                  {t.settings.importCsvSelectedFile}: {csvFileName}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handlePreviewCsv()}
                  disabled={isCsvPreviewing || !csvContent}
                >
                  {isCsvPreviewing
                    ? t.settings.modalSaving
                    : t.settings.importCsvPreview}
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleImportCsv()}
                  disabled={!canImportCsv || isCsvImporting}
                  className="bg-[#1D4ED8] hover:bg-[#2563EB]"
                >
                  {isCsvImporting
                    ? t.settings.modalSaving
                    : t.settings.importCsvSubmit}
                </Button>
              </div>
              {csvPreview ? (
                <div className="mt-4 rounded-lg border border-gray-200 p-4">
                  <p className="font-semibold text-gray-900 mb-2">
                    {t.settings.importCsvSummary}
                  </p>
                  <p className="text-sm text-gray-700">
                    {t.settings.importCsvTotalRows}: {csvPreview.summary.totalRows}
                  </p>
                  <p className="text-sm text-green-700">
                    {t.settings.importCsvValidRows}: {csvPreview.summary.validRows}
                  </p>
                  <p className="text-sm text-red-700">
                    {t.settings.importCsvInvalidRows}:{" "}
                    {csvPreview.summary.invalidRows}
                  </p>
                  {csvPreview.rows.some((row) => row.status === "invalid") ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {t.settings.importCsvErrorsTitle}
                      </p>
                      {csvPreview.rows
                        .filter((row) => row.status === "invalid")
                        .map((row) => (
                          <p
                            key={row.line}
                            className="text-xs text-red-700 break-words"
                          >
                            {t.settings.importCsvLine} {row.line}:{" "}
                            {row.errors.join("; ")}
                          </p>
                        ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-500">
                  {t.settings.importCsvNoPreview}
                </p>
              )}
            </section>

            <section className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-red-200 p-4 sm:p-6">
              <h2 className="text-lg font-bold text-red-700 mb-1">
                {t.settings.deleteAllTitle}
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                {t.settings.deleteAllDescription}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteAllModalOpen(true)}
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t.settings.deleteAllButton}
              </Button>
            </section>
          </div>
        ) : null}
      </main>

      <DeleteConfirmModal
        isOpen={deleteAllModalOpen}
        onClose={() => setDeleteAllModalOpen(false)}
        onConfirm={() => void handleDeleteAllConfirm()}
        title={t.settings.deleteAllModalTitle}
        description={t.settings.deleteAllConfirm}
        confirmLabel={t.settings.deleteAllButton}
        isDeleting={isDeletingAll}
      />
    </TeamLayout>
  );
}