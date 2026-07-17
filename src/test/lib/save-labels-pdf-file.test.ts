import { describe, expect, it } from "vitest";
import {
  buildLabelsPdfFilename,
  resolveSavedLabelsPdfPath,
} from "@/lib/labels/save-labels-pdf-file";

describe("save-labels-pdf-file", () => {
  it("builds a safe pdf filename from team name", () => {
    expect(buildLabelsPdfFilename("Ops Team")).toMatch(
      /^labels-ops-team-\d{4}-\d{2}-\d{2}\.pdf$/
    );
  });

  it("prefers directory and file name when resolving saved pdf path", () => {
    expect(
      resolveSavedLabelsPdfPath({
        filePath: "/Users/test/Downloads/Oficina Pro/labels-teste-2026-07-15.pdf",
        fileName: "labels-teste-2026-07-15.pdf",
        directory: "/Users/test/Downloads/Oficina Pro/labels",
      })
    ).toBe(
      "/Users/test/Downloads/Oficina Pro/labels/labels-teste-2026-07-15.pdf"
    );
  });
});