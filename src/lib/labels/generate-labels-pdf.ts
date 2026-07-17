import jsPDF from "jspdf";
import QRCode from "qrcode";
import {
  getLabelDimensionsCm,
  getQRRenderWidth,
  getQRScaleFactor,
  LABEL_SIZE_PRESETS,
  type LabelSizePreset,
  type QRSizePreset,
} from "@/lib/labels/label-config";
import { buildLabelsPdfFilename } from "@/lib/labels/save-labels-pdf-file";

export type LabelPdfItem = {
  id: number;
  name: string | null;
  sku: string | null;
  barcode: string | null;
  currentStock: number | null;
  customFields?: Record<string, string> | null;
};

export type LabelPdfTeam = {
  name: string;
  labelCompanyInfo?: string | null;
  labelLogoUrl?: string | null;
};

export type LabelCustomFieldOption = {
  key: string;
  label: string;
  active: boolean;
};

export type GenerateLabelsPdfInput = {
  team: LabelPdfTeam;
  selectedItems: LabelPdfItem[];
  labelQuantityByItem: Record<number, number>;
  labelSizePreset: LabelSizePreset;
  customWidthCm: string;
  customHeightCm: string;
  qrSizePreset: QRSizePreset;
  customQRScale: string;
  includeQRCode: boolean;
  includeBarcode: boolean;
  includeItemName: boolean;
  includeSKU: boolean;
  includeStock: boolean;
  includeCompanyInfo: boolean;
  includeCustomFieldKeys: Record<string, boolean>;
  customFieldOptions: LabelCustomFieldOption[];
};

export type GenerateLabelsPdfResult = {
  labelCount: number;
  itemCount: number;
  invalidBarcodeCount: number;
  logoLoadFailed: boolean;
  fileName: string;
  pdfBytes: Uint8Array;
};

function normalizeToEan13(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 12 && digits.length !== 13) {
    return null;
  }

  const base12 = digits.slice(0, 12);
  const expectedCheck = (() => {
    let sum = 0;
    for (let idx = 0; idx < base12.length; idx++) {
      const num = Number(base12[idx]);
      sum += idx % 2 === 0 ? num : num * 3;
    }
    return (10 - (sum % 10)) % 10;
  })();

  if (digits.length === 13) {
    const providedCheck = Number(digits[12]);
    if (providedCheck !== expectedCheck) {
      return null;
    }
    return digits;
  }

  return `${base12}${expectedCheck}`;
}

function drawEan13Barcode(
  pdf: jsPDF,
  ean13: string,
  options: {
    centerX: number;
    y: number;
    maxWidth: number;
    height: number;
  }
): { renderedWidth: number } {
  const leftOdd = [
    "0001101",
    "0011001",
    "0010011",
    "0111101",
    "0100011",
    "0110001",
    "0101111",
    "0111011",
    "0110111",
    "0001011",
  ];
  const leftEven = [
    "0100111",
    "0110011",
    "0011011",
    "0100001",
    "0011101",
    "0111001",
    "0000101",
    "0010001",
    "0001001",
    "0010111",
  ];
  const right = [
    "1110010",
    "1100110",
    "1101100",
    "1000010",
    "1011100",
    "1001110",
    "1010000",
    "1000100",
    "1001000",
    "1110100",
  ];
  const parity = [
    "AAAAAA",
    "AABABB",
    "AABBAB",
    "AABBBA",
    "ABAABB",
    "ABBAAB",
    "ABBBAA",
    "ABABAB",
    "ABABBA",
    "ABBABA",
  ];

  const firstDigit = Number(ean13[0]);
  const leftDigits = ean13.slice(1, 7).split("").map(Number);
  const rightDigits = ean13.slice(7).split("").map(Number);

  let pattern = "101";
  const leftParity = parity[firstDigit];
  for (let i = 0; i < 6; i++) {
    pattern +=
      leftParity[i] === "A" ? leftOdd[leftDigits[i]] : leftEven[leftDigits[i]];
  }
  pattern += "01010";
  for (let i = 0; i < 6; i++) {
    pattern += right[rightDigits[i]];
  }
  pattern += "101";

  const patternModules = pattern.length;
  const quietModules = 7;
  const totalModules = patternModules + quietModules * 2;
  let moduleWidth = Math.max(0.22, Math.min(0.45, options.height / 18));
  moduleWidth = Math.min(moduleWidth, options.maxWidth / totalModules);
  const renderedWidth = totalModules * moduleWidth;
  const startX =
    options.centerX - renderedWidth / 2 + quietModules * moduleWidth;
  const guardHeight = options.height * 1.08;
  let cursorX = startX;
  pdf.setFillColor(0, 0, 0);
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === "1") {
      const isGuard =
        i < 3 || (i >= 45 && i < 50) || i >= pattern.length - 3;
      pdf.rect(
        cursorX,
        options.y,
        moduleWidth,
        isGuard ? guardHeight : options.height,
        "F"
      );
    }
    cursorX += moduleWidth;
  }
  return { renderedWidth };
}

function resolveLogoDataUrl(team: LabelPdfTeam): {
  dataUrl: string | null;
  failedToLoad: boolean;
} {
  const url = team.labelLogoUrl?.trim();
  if (!url) {
    return { dataUrl: null, failedToLoad: false };
  }
  if (url.startsWith("data:")) {
    return { dataUrl: url, failedToLoad: false };
  }
  return { dataUrl: url, failedToLoad: false };
}

export async function generateLabelsPdf(
  input: GenerateLabelsPdfInput
): Promise<GenerateLabelsPdfResult> {
  const {
    team,
    selectedItems,
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
  } = input;

  const getItemQuantity = (itemId: number) =>
    Math.max(1, labelQuantityByItem[itemId] ?? 1);

  const labelsToPrint = selectedItems.flatMap((item) =>
    Array.from({ length: getItemQuantity(item.id) }, () => item)
  );

  const { dataUrl: companyLogoDataUrl, failedToLoad: logoLoadFailed } =
    resolveLogoDataUrl(team);

  const customFieldLabelByKey = new Map(
    customFieldOptions.map((field) => [field.key, field.label || field.key])
  );

  const { widthCm, heightCm } = getLabelDimensionsCm(
    labelSizePreset,
    customWidthCm,
    customHeightCm
  );
  const isZebraLayout =
    labelSizePreset !== "custom" && LABEL_SIZE_PRESETS[labelSizePreset].zebra;
  const invalidBarcodeItemIds = new Set<number>();
  const pdf = isZebraLayout
    ? new jsPDF({
        orientation: heightCm >= widthCm ? "p" : "l",
        unit: "mm",
        format: [widthCm * 10, heightCm * 10],
      })
    : new jsPDF("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = isZebraLayout ? 2 : 10;
  const availableWidth = pageWidth - 2 * margin;
  const availableHeight = pageHeight - 2 * margin;
  const labelWidth = isZebraLayout ? availableWidth : widthCm * 10;
  const labelHeight = isZebraLayout ? availableHeight : heightCm * 10;
  const horizontalGap = isZebraLayout ? 0 : 2;
  const verticalGap = isZebraLayout ? 0 : 2;
  const cols = isZebraLayout
    ? 1
    : Math.max(
        1,
        Math.floor(
          (availableWidth + horizontalGap) / (labelWidth + horizontalGap)
        )
      );
  const rows = isZebraLayout
    ? 1
    : Math.max(
        1,
        Math.floor(
          (availableHeight + verticalGap) / (labelHeight + verticalGap)
        )
      );
  let currentRow = 0;
  let currentCol = 0;
  const qrScaleFactor = getQRScaleFactor(qrSizePreset, customQRScale);

  for (const item of labelsToPrint) {
    if (currentRow >= rows) {
      pdf.addPage();
      currentRow = 0;
      currentCol = 0;
    }

    const x = margin + currentCol * (labelWidth + horizontalGap);
    const y = margin + currentRow * (labelHeight + verticalGap);
    const innerPadding = 2;
    const innerX = x + innerPadding;
    const innerY = y + innerPadding;
    const innerW = labelWidth - innerPadding * 2;
    const innerH = labelHeight - innerPadding * 2;
    const innerBottom = innerY + innerH;

    pdf.setDrawColor(200, 200, 200);
    pdf.rect(x, y, labelWidth, labelHeight);

    const titleFont = Math.max(7, Math.min(11, labelHeight * 0.14));
    const bodyFont = Math.max(6, Math.min(9, labelHeight * 0.12));
    const metaFont = Math.max(5, bodyFont - 1);
    const lineStep = Math.max(2.5, bodyFont * 0.45);
    const baseQRSize = isZebraLayout
      ? Math.min(34, Math.min(innerW * 0.58, innerH * 0.46))
      : Math.min(28, Math.min(innerW * 0.42, innerH * 0.44));
    const qrSize = Math.max(
      16,
      Math.min(
        baseQRSize * qrScaleFactor,
        Math.min(innerW * 0.82, innerH * 0.68)
      )
    );
    const logoSize = Math.max(8, Math.min(14, innerH * 0.24));
    const centerX = innerX + innerW / 2;

    let currentY = innerY;

    const getClampedLines = (
      text: string,
      maxWidth: number,
      maxLines: number
    ): string[] => {
      if (!text.trim()) return [];
      const splitRaw = pdf.splitTextToSize(text, maxWidth);
      return (Array.isArray(splitRaw) ? splitRaw : [splitRaw]).slice(
        0,
        maxLines
      );
    };

    const addFittedText = (
      text: string,
      options: {
        fontSize: number;
        maxWidth: number;
        maxLines: number;
        color: [number, number, number];
        x: number;
        y: number;
      }
    ): number => {
      if (!text.trim()) return 0;
      pdf.setFontSize(options.fontSize);
      pdf.setTextColor(...options.color);
      const lines = getClampedLines(text, options.maxWidth, options.maxLines);
      if (lines.length === 0) return 0;
      pdf.text(lines, options.x, options.y, {
        maxWidth: options.maxWidth,
      });
      return lines.length;
    };

    const addCenteredText = (
      text: string,
      options: {
        fontSize: number;
        maxWidth: number;
        maxLines: number;
        color: [number, number, number];
        y: number;
      }
    ): number => {
      if (!text.trim()) return 0;
      pdf.setFontSize(options.fontSize);
      pdf.setTextColor(...options.color);
      const lines = getClampedLines(text, options.maxWidth, options.maxLines);
      if (lines.length === 0) return 0;
      pdf.text(lines, centerX, options.y, {
        align: "center",
        maxWidth: options.maxWidth,
      });
      return lines.length;
    };

    if (includeQRCode && item.barcode) {
      try {
        const qrDataUrl = await QRCode.toDataURL(item.barcode, {
          width: getQRRenderWidth(qrSizePreset, qrSize),
          margin: 1,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
        const qrX = centerX - qrSize / 2;
        pdf.addImage(qrDataUrl, "PNG", qrX, currentY, qrSize, qrSize);
        currentY += qrSize + 1.5;
      } catch (error) {
        console.error("Error generating QR code:", error);
      }
    }

    if (includeItemName && item.name) {
      const titleLines = addCenteredText(item.name, {
        fontSize: titleFont,
        maxWidth: innerW,
        maxLines: 2,
        color: [15, 23, 42],
        y: currentY + lineStep,
      });
      currentY += Math.max(lineStep, titleLines * lineStep) + 1;
    }

    if (includeSKU && item.sku) {
      const used = addCenteredText(`SKU: ${item.sku}`, {
        fontSize: metaFont,
        maxWidth: innerW,
        maxLines: 1,
        color: [75, 85, 99],
        y: currentY + lineStep,
      });
      currentY += Math.max(lineStep, used * lineStep);
    }

    if (includeBarcode && item.barcode) {
      const ean13 = normalizeToEan13(item.barcode);
      if (!ean13) {
        invalidBarcodeItemIds.add(item.id);
        const safeY = Math.min(currentY + lineStep, innerBottom - 0.8);
        addCenteredText(item.barcode, {
          fontSize: metaFont,
          maxWidth: innerW,
          maxLines: 1,
          color: [30, 41, 59],
          y: safeY,
        });
        currentY = Math.max(currentY, safeY + lineStep);
      } else {
        const barcodeHeight = Math.max(4, lineStep * 1.6);
        const barcodeMaxWidth = innerW * 0.9;
        const barcodeY = currentY + 1;
        const barcodeTextY =
          barcodeY + barcodeHeight + Math.max(1.2, lineStep * 0.75);

        if (barcodeTextY + 0.5 <= innerBottom) {
          const rendered = drawEan13Barcode(pdf, ean13, {
            centerX,
            y: barcodeY,
            maxWidth: barcodeMaxWidth,
            height: barcodeHeight,
          });
          addCenteredText(ean13, {
            fontSize: Math.max(4.8, metaFont - 0.5),
            maxWidth: Math.max(rendered.renderedWidth, innerW * 0.45),
            maxLines: 1,
            color: [30, 41, 59],
            y: barcodeTextY,
          });
          currentY = barcodeTextY + 0.8;
        } else {
          const safeY = Math.min(currentY + lineStep, innerBottom - 0.8);
          addCenteredText(ean13, {
            fontSize: metaFont,
            maxWidth: innerW,
            maxLines: 1,
            color: [30, 41, 59],
            y: safeY,
          });
          currentY = Math.max(currentY, safeY + lineStep);
        }
      }
    }

    if (
      includeStock &&
      item.currentStock !== null &&
      currentY + lineStep <= innerBottom
    ) {
      const used = addCenteredText(`Stock: ${item.currentStock}`, {
        fontSize: metaFont,
        maxWidth: innerW,
        maxLines: 1,
        color: [100, 100, 100],
        y: currentY + lineStep,
      });
      currentY += Math.max(lineStep, used * lineStep);
    }

    const companyEnabled =
      includeCompanyInfo &&
      (companyLogoDataUrl || team.name || team.labelCompanyInfo);
    const rightTextX = companyLogoDataUrl ? innerX + logoSize + 2 : innerX;
    const rightTextW = companyLogoDataUrl ? innerW - logoSize - 2 : innerW;
    const companyNameLines = team.name
      ? getClampedLines(team.name, rightTextW, 1)
      : [];
    const companyInfoLines = team.labelCompanyInfo
      ? getClampedLines(team.labelCompanyInfo, rightTextW, 2)
      : [];
    const companyTextLineCount =
      companyNameLines.length + companyInfoLines.length;
    const companyTextHeight =
      companyTextLineCount > 0 ? companyTextLineCount * lineStep : 0;
    const companyBlockHeight = companyEnabled
      ? Math.max(logoSize, companyTextHeight || logoSize)
      : 0;
    const companyBlockTop = companyEnabled
      ? innerBottom - companyBlockHeight
      : innerBottom;

    const renderableCustomFields = customFieldOptions
      .filter((field) => includeCustomFieldKeys[field.key])
      .map((field) => {
        const fieldValue = item.customFields?.[field.key];
        if (!fieldValue) return null;
        const fieldLabel = customFieldLabelByKey.get(field.key) ?? field.key;
        const lines = getClampedLines(`${fieldLabel}: ${fieldValue}`, innerW, 2);
        if (lines.length === 0) return null;
        return {
          key: field.key,
          text: `${fieldLabel}: ${fieldValue}`,
          lines,
          height: Math.max(lineStep, lines.length * lineStep),
        };
      })
      .filter(
        (
          field
        ): field is {
          key: string;
          text: string;
          lines: string[];
          height: number;
        } => Boolean(field)
      );

    const customFieldsHeight = renderableCustomFields.reduce(
      (total, field) => total + field.height,
      0
    );
    const customFieldsStartY =
      renderableCustomFields.length > 0
        ? Math.max(
            currentY + 1.5,
            companyBlockTop - customFieldsHeight - (companyEnabled ? 3 : 0)
          )
        : currentY;

    let fieldsY = customFieldsStartY;
    for (const field of renderableCustomFields) {
      if (fieldsY + lineStep > companyBlockTop) {
        break;
      }
      const availableLines = Math.max(
        1,
        Math.floor((companyBlockTop - fieldsY) / lineStep)
      );
      const used = addFittedText(field.text, {
        fontSize: metaFont,
        maxWidth: innerW,
        maxLines: Math.min(field.lines.length, availableLines),
        color: [80, 80, 80],
        x: innerX,
        y: fieldsY + lineStep,
      });
      fieldsY += Math.max(lineStep, used * lineStep);
    }

    if (companyEnabled && companyBlockTop + lineStep <= innerBottom) {
      let rightTextY = companyBlockTop;

      if (companyLogoDataUrl) {
        const logoFormat = companyLogoDataUrl.includes("data:image/jpeg")
          ? "JPEG"
          : "PNG";
        pdf.addImage(
          companyLogoDataUrl,
          logoFormat,
          innerX,
          companyBlockTop,
          logoSize,
          logoSize
        );
      }

      if (companyNameLines.length > 0 && rightTextY + lineStep <= innerBottom) {
        const used = addFittedText(team.name, {
          fontSize: bodyFont,
          maxWidth: rightTextW,
          maxLines: companyNameLines.length,
          color: [55, 65, 81],
          x: rightTextX,
          y: rightTextY + lineStep,
        });
        rightTextY += Math.max(lineStep, used * lineStep);
      }

      if (companyInfoLines.length > 0 && rightTextY + lineStep <= innerBottom) {
        addFittedText(team.labelCompanyInfo ?? "", {
          fontSize: metaFont,
          maxWidth: rightTextW,
          maxLines: companyInfoLines.length,
          color: [107, 114, 128],
          x: rightTextX,
          y: rightTextY + lineStep,
        });
      }
    }

    currentCol++;
    if (currentCol >= cols) {
      currentCol = 0;
      currentRow++;
    }
  }

  const fileName = buildLabelsPdfFilename(team.name || "items");
  const pdfBytes = new Uint8Array(pdf.output("arraybuffer"));

  return {
    labelCount: labelsToPrint.length,
    itemCount: selectedItems.length,
    invalidBarcodeCount: invalidBarcodeItemIds.size,
    logoLoadFailed,
    fileName,
    pdfBytes,
  };
}