import { describe, expect, it } from "vitest";
import {
  getLabelDimensionsCm,
  getQRScaleFactor,
  parseCm,
} from "@/lib/labels/label-config";

describe("label-config", () => {
  it("clamps custom dimensions to allowed range", () => {
    expect(
      getLabelDimensionsCm("custom", "100", "0")
    ).toEqual({ widthCm: 18, heightCm: 2 });
  });

  it("parses comma decimal values", () => {
    expect(parseCm("10,5", 0)).toBe(10.5);
  });

  it("returns custom QR scale factor", () => {
    expect(getQRScaleFactor("custom", "180")).toBe(1.8);
    expect(getQRScaleFactor("large", "125")).toBe(1.25);
  });
});