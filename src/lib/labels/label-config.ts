export type LabelSizePreset =
  | "default_10x5"
  | "custom"
  | "zebra_100x150"
  | "zebra_60x40"
  | "zebra_110x64"
  | "zebra_170x64";

export type QRSizePreset = "medium" | "large" | "extra_large" | "small" | "custom";

export const LABEL_SIZE_PRESETS: Record<
  Exclude<LabelSizePreset, "custom">,
  { widthCm: number; heightCm: number; zebra: boolean }
> = {
  default_10x5: { widthCm: 10, heightCm: 5, zebra: false },
  zebra_100x150: { widthCm: 10, heightCm: 15, zebra: true },
  zebra_60x40: { widthCm: 6, heightCm: 4, zebra: true },
  zebra_110x64: { widthCm: 11, heightCm: 6.4, zebra: true },
  zebra_170x64: { widthCm: 17, heightCm: 6.4, zebra: true },
};

export function parseCm(value: string, fallback: number) {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

export function getLabelDimensionsCm(
  labelSizePreset: LabelSizePreset,
  customWidthCm: string,
  customHeightCm: string
) {
  if (labelSizePreset !== "custom") {
    const preset = LABEL_SIZE_PRESETS[labelSizePreset];
    return { widthCm: preset.widthCm, heightCm: preset.heightCm };
  }

  const widthCm = Math.min(Math.max(parseCm(customWidthCm, 10), 3), 18);
  const heightCm = Math.min(Math.max(parseCm(customHeightCm, 5), 2), 12);
  return { widthCm, heightCm };
}

export function getQRScaleFactor(
  qrSizePreset: QRSizePreset,
  customQRScale: string
) {
  switch (qrSizePreset) {
    case "small":
      return 0.85;
    case "medium":
      return 1;
    case "large":
      return 1.25;
    case "extra_large":
      return 1.7;
    case "custom": {
      const parsed = Number.parseInt(customQRScale, 10);
      const safeScale = Number.isFinite(parsed)
        ? Math.min(Math.max(parsed, 70), 180)
        : 125;
      return safeScale / 100;
    }
    default:
      return 1.25;
  }
}

export function getQRRenderWidth(qrSizePreset: QRSizePreset, qrSize: number) {
  if (qrSizePreset === "extra_large") {
    return 800;
  }
  return qrSize * 4;
}