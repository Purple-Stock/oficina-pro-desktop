import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Search,
  Printer,
  Download,
  Eye,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/i18n";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { generateLabelsPdf } from "@/lib/labels/generate-labels-pdf";
import {
  openLabelsPdfFile,
  revealLabelsPdfInDir,
  resolveSavedLabelsPdfPath,
  saveLabelsPdfFile,
  type SavedLabelsPdf,
} from "@/lib/labels/save-labels-pdf-file";
import {
  getLabelDimensionsCm,
  getQRScaleFactor,
  parseCm,
  type LabelSizePreset,
  type QRSizePreset,
} from "@/lib/labels/label-config";
import type { TeamDto } from "@/services/types";

export type LabelItem = {
  id: number;
  name: string | null;
  sku: string | null;
  barcode: string | null;
  currentStock: number | null;
  price: number | null;
  locationName?: string | null;
  customFields?: Record<string, string> | null;
};

type LabelsPageClientProps = {
  team: TeamDto;
  items: LabelItem[];
};

type PdfFeedbackWarning = {
  title: string;
  description: string;
};

type PdfFeedback = {
  status: "success" | "error";
  title: string;
  description: string;
  savedFile?: SavedLabelsPdf;
  warnings?: PdfFeedbackWarning[];
};

export function LabelsPageClient({ team, items }: LabelsPageClientProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [labelSizePreset, setLabelSizePreset] =
    useState<LabelSizePreset>("zebra_100x150");
  const [customWidthCm, setCustomWidthCm] = useState("10");
  const [customHeightCm, setCustomHeightCm] = useState("5");
  const [labelQuantityByItem, setLabelQuantityByItem] = useState<
    Record<number, number>
  >({});
  const [includeQRCode, setIncludeQRCode] = useState(true);
  const [qrSizePreset, setQrSizePreset] = useState<QRSizePreset>("large");
  const [customQRScale, setCustomQRScale] = useState("125");
  const [includeBarcode, setIncludeBarcode] = useState(false);
  const [includeItemName, setIncludeItemName] = useState(true);
  const [includeSKU, setIncludeSKU] = useState(true);
  const [includeStock, setIncludeStock] = useState(false);
  const customFieldOptions = useMemo(() => {
    if (team.itemCustomFieldSchema && team.itemCustomFieldSchema.length > 0) {
      return team.itemCustomFieldSchema;
    }
    const discovered = new Set<string>();
    for (const item of items) {
      for (const key of Object.keys(item.customFields ?? {})) {
        discovered.add(key);
      }
    }
    return Array.from(discovered).map((key) => ({
      key,
      label: key,
      active: true,
    }));
  }, [items, team.itemCustomFieldSchema]);
  const customFieldLabelByKey = useMemo(
    () =>
      new Map(
        customFieldOptions.map((field) => [
          field.key,
          field.label || field.key,
        ])
      ),
    [customFieldOptions]
  );
  const [includeCustomFieldKeys, setIncludeCustomFieldKeys] = useState<
    Record<string, boolean>
  >(() =>
    Object.fromEntries(
      customFieldOptions.map((field) => [field.key, field.active])
    )
  );
  const [includeCompanyInfo, setIncludeCompanyInfo] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [pdfFeedback, setPdfFeedback] = useState<PdfFeedback | null>(null);
  const [savedFileActionError, setSavedFileActionError] = useState<string | null>(
    null
  );

  useEffect(() => {
    setIncludeCustomFieldKeys(
      Object.fromEntries(
        customFieldOptions.map((field) => [field.key, field.active])
      )
    );
  }, [customFieldOptions]);

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.name?.toLowerCase().includes(query) ||
      item.sku?.toLowerCase().includes(query) ||
      item.barcode?.toLowerCase().includes(query)
    );
  });

  const toggleItemSelection = (itemId: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
      setLabelQuantityByItem((prev) =>
        prev[itemId] ? prev : { ...prev, [itemId]: 1 }
      );
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    setLabelQuantityByItem((prev) => {
      const next = { ...prev };
      for (const item of filteredItems) {
        if (!next[item.id] || next[item.id] < 1) next[item.id] = 1;
      }
      return next;
    });
    setSelectedItems((prev) => {
      const next = new Set(prev);
      for (const item of filteredItems) {
        next.add(item.id);
      }
      return next;
    });
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const deselectFilteredItems = () => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      for (const item of filteredItems) {
        next.delete(item.id);
      }
      return next;
    });
  };

  const getSelectedItemsList = () => {
    return items.filter((item) => selectedItems.has(item.id));
  };

  const getItemQuantity = (itemId: number) =>
    Math.max(1, labelQuantityByItem[itemId] ?? 1);
  const getTotalLabelsCount = () =>
    Array.from(selectedItems).reduce(
      (total, itemId) => total + getItemQuantity(itemId),
      0
    );

  const totalSelectedLabels = getTotalLabelsCount();
  const isCustomSize = labelSizePreset === "custom";
  const previewItem =
    getSelectedItemsList()[0] ?? filteredItems[0] ?? items[0] ?? null;
  const previewCustomFields = customFieldOptions
    .filter(
      (field) =>
        includeCustomFieldKeys[field.key] && previewItem?.customFields?.[field.key]
    )
    .map((field) => ({
      key: field.key,
      label: customFieldLabelByKey.get(field.key) ?? field.key,
      value: previewItem?.customFields?.[field.key] ?? "",
    }));

  const updateItemQuantity = (itemId: number, rawValue: string) => {
    const parsed = Number.parseInt(rawValue, 10);
    const normalized = Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
    setLabelQuantityByItem((prev) => ({ ...prev, [itemId]: normalized }));
  };

  const getQRSizePresetLabel = () => {
    switch (qrSizePreset) {
      case "small":
        return t.labels.small;
      case "medium":
        return t.labels.medium;
      case "large":
        return t.labels.large;
      case "extra_large":
        return t.labels.extraLarge;
      case "custom":
        return `${customQRScale}%`;
      default:
        return t.labels.large;
    }
  };

  const { widthCm: normalizedWidthCm, heightCm: normalizedHeightCm } =
    getLabelDimensionsCm(labelSizePreset, customWidthCm, customHeightCm);
  const requestedWidthCm = parseCm(customWidthCm, normalizedWidthCm);
  const requestedHeightCm = parseCm(customHeightCm, normalizedHeightCm);
  const customDimensionsAdjusted =
    isCustomSize &&
    (requestedWidthCm !== normalizedWidthCm ||
      requestedHeightCm !== normalizedHeightCm);
  const qrScaleFactor = getQRScaleFactor(qrSizePreset, customQRScale);
  const previewScaleStyle = {
    transform: `scale(${Math.min(Math.max(qrScaleFactor, 0.85), 1.45)})`,
  };
  const previewSheetStyle = {
    width: `${normalizedWidthCm}cm`,
    height: `${normalizedHeightCm}cm`,
    maxWidth: "none",
  };

  const handleOpenSavedPdf = async (savedFile: SavedLabelsPdf) => {
    setSavedFileActionError(null);
    try {
      await openLabelsPdfFile(savedFile);
    } catch (error) {
      console.error("Error opening PDF:", error);
      setSavedFileActionError(t.labels.openPdfErrorDescription);
    }
  };

  const handleRevealSavedPdf = async (savedFile: SavedLabelsPdf) => {
    setSavedFileActionError(null);
    try {
      await revealLabelsPdfInDir(savedFile);
    } catch (error) {
      console.error("Error revealing PDF in folder:", error);
      setSavedFileActionError(t.labels.showInFolderErrorDescription);
    }
  };

  const generatePDF = async () => {
    if (selectedItems.size === 0) {
      return;
    }

    setIsGenerating(true);
    setPdfFeedback(null);
    setSavedFileActionError(null);

    try {
      const selectedItemsList = getSelectedItemsList();
      const result = await generateLabelsPdf({
        team: {
          name: team.name,
          labelCompanyInfo: team.labelCompanyInfo,
          labelLogoUrl: team.labelLogoUrl,
        },
        selectedItems: selectedItemsList,
        labelQuantityByItem,
        labelSizePreset,
        customWidthCm,
        customHeightCm,
        qrSizePreset,
        customQRScale,
        includeQRCode,
        includeBarcode,
        includeItemName,
        includeSKU,
        includeStock,
        includeCompanyInfo,
        includeCustomFieldKeys,
        customFieldOptions,
      });

      const warnings: PdfFeedbackWarning[] = [];

      if (result.logoLoadFailed) {
        warnings.push({
          title: t.labels.logoLoadErrorTitle,
          description: t.labels.logoLoadErrorDescription,
        });
      }

      if (result.invalidBarcodeCount > 0) {
        warnings.push({
          title: t.labels.invalidBarcodeTitle,
          description: t.labels.invalidBarcodeDescription.replace(
            "{count}",
            String(result.invalidBarcodeCount)
          ),
        });
      }

      const savedFile = await saveLabelsPdfFile(
        result.fileName,
        result.pdfBytes
      );

      setPdfFeedback({
        status: "success",
        title: t.labels.generateSuccessTitle,
        description: t.labels.generateSuccessDescription
          .replace("{count}", String(result.labelCount))
          .replace("{items}", String(result.itemCount)),
        savedFile,
        warnings: warnings.length > 0 ? warnings : undefined,
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      setPdfFeedback({
        status: "error",
        title: t.labels.generateErrorTitle,
        description: t.labels.generateErrorDescription,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <TeamLayout team={team} activeMenuItem="labels">
      <main className="p-4 sm:p-6 md:p-8">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1D4ED8] mb-1 sm:mb-2">
            {t.labels.title}
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-gray-600">
            {t.labels.subtitle}
          </p>
        </div>

        <div className="mb-4 sm:mb-6 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {t.labels.selectItems}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {t.labels.settingsHelper}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPreviewOpen(true)}
                className="border-[#D6BCFA] bg-[#FAF5FF] text-[#1D4ED8] hover:bg-[#F3E8FF]"
              >
                <Eye className="mr-2 h-4 w-4" />
                {t.labels.previewButton}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {t.labels.settingsFormatTitle}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {t.labels.settingsFormatDescription}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(220px,1.1fr)_minmax(140px,0.8fr)_minmax(140px,0.8fr)]">
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                    {t.labels.labelSize}
                  </Label>
                  <select
                    aria-label={t.labels.labelSize}
                    value={labelSizePreset}
                    onChange={(e) =>
                      setLabelSizePreset(e.target.value as LabelSizePreset)
                    }
                    className="w-full h-11 text-base border border-gray-300 rounded-md px-3 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]"
                  >
                    <option value="default_10x5">{t.labels.default10x5}</option>
                    <option value="zebra_100x150">Zebra 100 x 150 mm</option>
                    <option value="zebra_60x40">Zebra 60 x 40 mm</option>
                    <option value="zebra_110x64">Zebra 110 x 64 mm</option>
                    <option value="zebra_170x64">Zebra 170 x 64 mm</option>
                    <option value="custom">{t.labels.customSize}</option>
                  </select>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                    {t.labels.widthCm}
                  </Label>
                  <Input
                    type="text"
                    value={
                      isCustomSize
                        ? customWidthCm
                        : String(normalizedWidthCm)
                    }
                    onChange={(e) => setCustomWidthCm(e.target.value)}
                    disabled={!isCustomSize}
                    className="h-11 text-base border-gray-300 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                    {t.labels.heightCm}
                  </Label>
                  <Input
                    type="text"
                    value={
                      isCustomSize
                        ? customHeightCm
                        : String(normalizedHeightCm)
                    }
                    onChange={(e) => setCustomHeightCm(e.target.value)}
                    disabled={!isCustomSize}
                    className="h-11 text-base border-gray-300 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]"
                  />
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {t.labels.previewLabel}
                </div>
                <div className="mt-1 text-base font-semibold text-slate-800">
                  {`${normalizedWidthCm} x ${normalizedHeightCm} cm`}
                </div>
                {isCustomSize ? (
                  <div className="mt-2 text-xs text-slate-600">
                    <p>{t.labels.customSizeLimits}</p>
                    {customDimensionsAdjusted ? (
                      <p className="mt-1 text-amber-700">
                        {t.labels.customSizeAdjusted
                          .replace("{width}", String(normalizedWidthCm))
                          .replace("{height}", String(normalizedHeightCm))}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-[#E9D5FF] bg-gradient-to-br from-[#FAF5FF] via-white to-[#F8FAFC] p-4 sm:p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7E22CE]">
                  {t.labels.settingsPreviewTitle}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {t.labels.settingsPreviewDescription}
                </p>
              </div>
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
                {previewItem ? (
                  <div className="mx-auto flex min-h-[280px] max-w-[220px] flex-col rounded-[24px] border border-slate-300 bg-white p-4 shadow-inner">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {team.name}
                        </p>
                        <h4 className="mt-1 text-sm font-semibold text-slate-900">
                          {previewItem.name || t.items.unnamedItem}
                        </h4>
                      </div>
                      <div className="rounded-full bg-[#F3E8FF] px-2 py-1 text-[10px] font-semibold text-[#7E22CE]">
                        {`${normalizedWidthCm} x ${normalizedHeightCm}`}
                      </div>
                    </div>
                    {includeQRCode && previewItem.barcode ? (
                      <div className="flex flex-1 items-center justify-center py-4">
                        <div
                          className="rounded-2xl border border-slate-200 bg-white p-3 transition-transform"
                          style={previewScaleStyle}
                        >
                          <QRCodeDisplay value={previewItem.barcode} size={88} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                        {t.labels.previewNoQr}
                      </div>
                    )}
                    <div className="space-y-1.5 border-t border-slate-200 pt-3 text-xs text-slate-600">
                      {includeSKU && previewItem.sku ? (
                        <p>{`SKU: ${previewItem.sku}`}</p>
                      ) : null}
                      {includeBarcode && previewItem.barcode ? (
                        <p>{previewItem.barcode}</p>
                      ) : null}
                      {includeStock && previewItem.currentStock !== null ? (
                        <p>{`Stock: ${previewItem.currentStock}`}</p>
                      ) : null}
                      {includeCompanyInfo && team.name ? (
                        <p className="pt-1 font-medium text-slate-800">
                          {team.name}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                    {t.labels.previewEmpty}
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {t.labels.settingsContentTitle}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {t.labels.settingsContentDescription}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeQRCode}
                    onChange={(e) => setIncludeQRCode(e.target.checked)}
                    className="w-4 h-4 text-[#1D4ED8] border-gray-300 rounded focus:ring-[#1D4ED8]"
                  />
                  <span className="text-sm text-gray-700">
                    {t.labels.includeQRCode}
                  </span>
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeBarcode}
                    onChange={(e) => setIncludeBarcode(e.target.checked)}
                    className="w-4 h-4 text-[#1D4ED8] border-gray-300 rounded focus:ring-[#1D4ED8]"
                  />
                  <span className="text-sm text-gray-700">
                    {t.labels.includeBarcode}
                  </span>
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeItemName}
                    onChange={(e) => setIncludeItemName(e.target.checked)}
                    className="w-4 h-4 text-[#1D4ED8] border-gray-300 rounded focus:ring-[#1D4ED8]"
                  />
                  <span className="text-sm text-gray-700">
                    {t.labels.includeItemName}
                  </span>
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSKU}
                    onChange={(e) => setIncludeSKU(e.target.checked)}
                    className="w-4 h-4 text-[#1D4ED8] border-gray-300 rounded focus:ring-[#1D4ED8]"
                  />
                  <span className="text-sm text-gray-700">
                    {t.labels.includeSKU}
                  </span>
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeStock}
                    onChange={(e) => setIncludeStock(e.target.checked)}
                    className="w-4 h-4 text-[#1D4ED8] border-gray-300 rounded focus:ring-[#1D4ED8]"
                  />
                  <span className="text-sm text-gray-700">
                    {t.labels.includeStock}
                  </span>
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCompanyInfo}
                    onChange={(e) => setIncludeCompanyInfo(e.target.checked)}
                    className="w-4 h-4 text-[#1D4ED8] border-gray-300 rounded focus:ring-[#1D4ED8]"
                  />
                  <span className="text-sm text-gray-700">
                    {t.labels.includeCompanyInfo}
                  </span>
                </label>
              </div>
              {customFieldOptions.length > 0 ? (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {customFieldOptions.map((field) => (
                    <label
                      key={field.key}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(includeCustomFieldKeys[field.key])}
                        onChange={(e) =>
                          setIncludeCustomFieldKeys((prev) => ({
                            ...prev,
                            [field.key]: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 text-[#1D4ED8] border-gray-300 rounded focus:ring-[#1D4ED8]"
                      />
                      <span className="text-sm text-gray-700">
                        {t.labels.includeCustomField}: {field.label}
                      </span>
                    </label>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {t.labels.qrSizeLabel}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {t.labels.qrPanelDescription}
                </p>
              </div>
              <div className="rounded-2xl border border-[#E9D5FF] bg-[#FAF5FF] p-4">
                <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                  {t.labels.qrSizeLabel}
                </Label>
                <select
                  aria-label={t.labels.qrSizeLabel}
                  value={qrSizePreset}
                  onChange={(e) =>
                    setQrSizePreset(e.target.value as QRSizePreset)
                  }
                  className="w-full h-10 text-sm border border-gray-300 rounded-md px-3 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]"
                >
                  <option value="small">{t.labels.small}</option>
                  <option value="medium">{t.labels.medium}</option>
                  <option value="large">{t.labels.large}</option>
                  <option value="extra_large">{t.labels.extraLarge}</option>
                  <option value="custom">{t.labels.customSize}</option>
                </select>
                {qrSizePreset === "custom" ? (
                  <div className="mt-3">
                    <Input
                      type="number"
                      min={70}
                      max={180}
                      step={5}
                      value={customQRScale}
                      onChange={(e) => setCustomQRScale(e.target.value)}
                      className="h-10 text-sm"
                      aria-label={t.labels.qrScaleLabel}
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      {t.labels.qrScaleHint}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-gray-500">
                    {t.labels.qrSizeHint}
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>

        <div className="mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            <Input
              type="text"
              placeholder={t.labels.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 sm:pl-10 h-11 text-base border-gray-300 focus:border-[#1D4ED8] focus:ring-[#1D4ED8]"
            />
          </div>
        </div>

        <div className="mb-4 sm:mb-6 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={selectAll}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm touch-manipulation min-h-[40px] sm:min-h-0"
          >
            <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            {t.labels.selectAll}
          </Button>
          <Button
            variant="outline"
            onClick={deselectAll}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm touch-manipulation min-h-[40px] sm:min-h-0"
          >
            <Square className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            {t.labels.deselectAll}
          </Button>
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPreviewOpen(true)}
              className="border-[#D6BCFA] text-[#1D4ED8] hover:bg-[#FAF5FF] text-xs sm:text-sm"
            >
              <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {t.labels.previewButton}
            </Button>
            <Button
              onClick={generatePDF}
              disabled={selectedItems.size === 0 || isGenerating}
              className="bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] hover:from-[#2563EB] hover:to-[#1D4ED8] text-white shadow-lg hover:shadow-xl transition-all text-xs sm:text-sm touch-manipulation min-h-[40px] sm:min-h-0"
            >
              {isGenerating ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  {t.common.loading}
                </>
              ) : (
                <>
                  <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  {t.labels.generatePDF}
                </>
              )}
            </Button>
          </div>
        </div>

        {pdfFeedback ? (
          <div
            role="status"
            aria-live="polite"
            className={`mb-4 sm:mb-6 rounded-xl border px-4 py-3 sm:px-5 sm:py-4 transition-all ${
              pdfFeedback.status === "success"
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                {pdfFeedback.status === "success" ? (
                  <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-700 shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 mt-0.5 text-red-700 shrink-0" />
                )}
                <div className="min-w-0">
                  <p
                    className={`text-sm sm:text-base font-semibold ${
                      pdfFeedback.status === "success"
                        ? "text-green-800"
                        : "text-red-800"
                    }`}
                  >
                    {pdfFeedback.title}
                  </p>
                  <p className="mt-1 text-xs sm:text-sm text-gray-700 break-words">
                    {pdfFeedback.description}
                  </p>
                  {pdfFeedback.savedFile ? (
                    <div className="mt-3 rounded-lg border border-green-200 bg-white/80 px-3 py-3">
                      <p className="text-xs sm:text-sm text-gray-600">
                        {t.labels.savedTo}
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-900 break-all">
                        {pdfFeedback.savedFile.fileName}
                      </p>
                      <p className="mt-1 text-[11px] sm:text-xs text-gray-500 break-all">
                        {resolveSavedLabelsPdfPath(pdfFeedback.savedFile)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="bg-[#1D4ED8] hover:bg-[#2563EB]"
                          onClick={() =>
                            void handleOpenSavedPdf(pdfFeedback.savedFile!)
                          }
                        >
                          {t.labels.openPdf}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-[#D6BCFA] text-[#1D4ED8] hover:bg-[#FAF5FF]"
                          onClick={() =>
                            void handleRevealSavedPdf(pdfFeedback.savedFile!)
                          }
                        >
                          {t.labels.showInFolder}
                        </Button>
                      </div>
                      {savedFileActionError ? (
                        <p className="mt-2 text-xs sm:text-sm text-amber-800">
                          {savedFileActionError}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 shrink-0 text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setPdfFeedback(null);
                  setSavedFileActionError(null);
                }}
                aria-label={t.common.close}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {pdfFeedback.warnings && pdfFeedback.warnings.length > 0 ? (
              <div className="mt-3 space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 sm:px-4 sm:py-3">
                {pdfFeedback.warnings.map((warning) => (
                  <div
                    key={warning.title}
                    className="flex items-start gap-2 text-amber-900"
                  >
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-700" />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold">
                        {warning.title}
                      </p>
                      <p className="text-xs sm:text-sm text-amber-800 break-words">
                        {warning.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-12">
                    <input
                      type="checkbox"
                      checked={
                        filteredItems.length > 0 &&
                        filteredItems.every((item) =>
                          selectedItems.has(item.id)
                        )
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          selectAll();
                        } else {
                          deselectFilteredItems();
                        }
                      }}
                      className="w-4 h-4 text-[#1D4ED8] border-gray-300 rounded focus:ring-[#1D4ED8]"
                    />
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    {t.labels.item}
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                    {t.labels.sku}
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                    {t.labels.barcode}
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                    {t.labels.location}
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                    {t.labels.stock}
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    {t.labels.quantityPerItem}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 sm:px-6 py-8 text-center text-gray-500 text-sm"
                    >
                      {searchQuery ? t.labels.noItemsSearch : t.labels.noItems}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${
                        selectedItems.has(item.id) ? "bg-blue-50" : ""
                      }`}
                      onClick={() => toggleItemSelection(item.id)}
                    >
                      <td className="px-4 sm:px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleItemSelection(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-[#1D4ED8] border-gray-300 rounded focus:ring-[#1D4ED8]"
                        />
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-3">
                          {includeQRCode && item.barcode ? (
                            <div className="hidden sm:block">
                              <QRCodeDisplay value={item.barcode} size={40} />
                            </div>
                          ) : null}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.name || t.items.unnamedItem}
                            </div>
                            {item.barcode ? (
                              <div className="text-xs text-gray-500 sm:hidden mt-1">
                                {t.labels.barcode}: {item.barcode}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                        <span className="text-sm text-gray-900">
                          {item.sku || "-"}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                        <span className="text-sm text-gray-900 font-mono">
                          {item.barcode || "-"}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 hidden lg:table-cell">
                        <span className="text-sm text-gray-900">
                          {item.locationName ||
                            t.stockByLocation.defaultLocation}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 hidden md:table-cell">
                        <span className="text-sm font-semibold text-gray-900">
                          {item.currentStock?.toFixed(1) || "0.0"}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          value={getItemQuantity(item.id)}
                          onChange={(e) =>
                            updateItemQuantity(item.id, e.target.value)
                          }
                          onClick={(e) => e.stopPropagation()}
                          className="h-9 w-20 text-sm"
                          disabled={!selectedItems.has(item.id)}
                          aria-label={`${t.labels.quantityPerItem} ${item.name || item.sku || item.id}`}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedItems.size > 0 ? (
          <div className="mt-4 sm:mt-6 bg-blue-50 rounded-xl sm:rounded-2xl border border-blue-200 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-sm sm:text-base font-semibold text-gray-700">
                {t.labels.selectedItemsSummary.replace(
                  "{count}",
                  String(selectedItems.size)
                )}
              </div>
              <div className="text-sm sm:text-base font-semibold text-gray-700">
                {t.labels.totalLabelsSummary.replace(
                  "{count}",
                  String(totalSelectedLabels)
                )}
              </div>
              <Button
                onClick={generatePDF}
                disabled={isGenerating}
                className="bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] hover:from-[#2563EB] hover:to-[#1D4ED8] text-white shadow-lg hover:shadow-xl transition-all w-full sm:w-auto touch-manipulation min-h-[48px] sm:min-h-0"
              >
                {isGenerating ? (
                  <>
                    <span className="mr-2 inline-block h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    {t.common.loading}
                  </>
                ) : (
                  <>
                    <Printer className="h-4 w-4 mr-2" />
                    {t.labels.generatePDF}
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : null}

        {isPreviewOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
            <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {t.labels.previewModalTitle}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {t.labels.previewModalDescription}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsPreviewOpen(false)}
                  className="h-10 w-10 p-0 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="grid gap-6 p-5 sm:grid-cols-[280px_minmax(0,1fr)] sm:p-6">
                <div className="rounded-3xl border border-[#E9D5FF] bg-gradient-to-br from-[#FAF5FF] to-white p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7E22CE]">
                    {t.labels.previewLabel}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-900">
                    {`${normalizedWidthCm} x ${normalizedHeightCm} cm`}
                  </div>
                  <div className="mt-5 space-y-4 text-sm text-slate-600">
                    <div>
                      <p className="font-medium text-slate-900">
                        {t.labels.qrSizeLabel}
                      </p>
                      <p>{getQRSizePresetLabel()}</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {t.labels.settingsContentTitle}
                      </p>
                      <p>
                        {[
                          includeQRCode ? t.labels.includeQRCode : null,
                          includeBarcode ? t.labels.includeBarcode : null,
                          includeItemName ? t.labels.includeItemName : null,
                          includeSKU ? t.labels.includeSKU : null,
                          includeStock ? t.labels.includeStock : null,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {t.labels.previewScaleTitle}
                      </p>
                      <div className="mt-2 inline-flex rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#1D4ED8] shadow-sm">
                        {t.labels.previewScaleReal}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        {t.labels.previewScaleGuide}
                      </p>
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm">
                        <span className="block h-1 w-[1cm] rounded-full bg-[#1D4ED8]" />
                        <span className="text-xs font-medium text-slate-600">
                          1 cm
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {t.labels.previewScaleDisclaimer}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
                  {previewItem ? (
                    <div className="flex max-h-[70vh] items-start justify-center overflow-auto rounded-[28px] border border-dashed border-slate-200 bg-white/70 p-4 sm:p-6">
                      <div
                        data-testid="label-preview-sheet"
                        className="flex flex-col rounded-[12px] border border-slate-300 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
                        style={previewSheetStyle}
                      >
                        <div className="flex flex-1 flex-col">
                          {includeQRCode && previewItem.barcode ? (
                            <div className="flex items-start justify-center pt-2">
                              <div
                                className="transition-transform"
                                style={previewScaleStyle}
                              >
                                <QRCodeDisplay
                                  value={previewItem.barcode}
                                  size={170}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex min-h-[140px] items-center justify-center rounded-[12px] border border-dashed border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-400">
                              {t.labels.previewNoQr}
                            </div>
                          )}
                          {includeItemName &&
                          (previewItem.name || t.items.unnamedItem) ? (
                            <div className="pt-4 text-center">
                              <h3 className="text-[20px] font-medium leading-tight text-slate-800">
                                {previewItem.name || t.items.unnamedItem}
                              </h3>
                            </div>
                          ) : null}
                          {includeSKU && previewItem.sku ? (
                            <p className="pt-1 text-center text-[15px] text-slate-600">{`SKU: ${previewItem.sku}`}</p>
                          ) : null}
                          {includeBarcode && previewItem.barcode ? (
                            <p className="pt-1 text-center text-[14px] text-slate-600">
                              {previewItem.barcode}
                            </p>
                          ) : null}
                          {includeStock && previewItem.currentStock !== null ? (
                            <p className="pt-1 text-center text-[14px] text-slate-600">{`Stock: ${previewItem.currentStock}`}</p>
                          ) : null}
                          {previewCustomFields.length > 0 ? (
                            <div className="pt-4 text-[14px] text-slate-600">
                              {previewCustomFields.map((field) => (
                                <p
                                  key={field.key}
                                  className="leading-snug"
                                >{`${field.label}: ${field.value}`}</p>
                              ))}
                            </div>
                          ) : null}
                          <div className="mt-auto pt-5">
                            {includeCompanyInfo &&
                            (team.labelLogoUrl ||
                              team.name ||
                              team.labelCompanyInfo) ? (
                              <div className="flex items-center gap-3 text-slate-600">
                                {team.labelLogoUrl ? (
                                  <img
                                    src={team.labelLogoUrl}
                                    alt={team.name}
                                    className="h-16 w-16 rounded-xl border border-slate-200 object-contain bg-white"
                                  />
                                ) : (
                                  <div className="h-16 w-16 rounded-xl border border-slate-200 bg-slate-100" />
                                )}
                                <div className="min-w-0">
                                  {team.name ? (
                                    <p className="text-[14px] font-medium leading-snug text-slate-700">
                                      {team.name}
                                    </p>
                                  ) : null}
                                  {team.labelCompanyInfo ? (
                                    <p className="text-[13px] leading-snug text-slate-500">
                                      {team.labelCompanyInfo}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white px-6 text-center text-sm text-slate-500">
                      {t.labels.previewEmpty}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </TeamLayout>
  );
}