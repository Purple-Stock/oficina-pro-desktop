import { invoke, isTauri } from "@tauri-apps/api/core";
import type { ServiceResult } from "@/services/types";

export type SavedLabelsPdf = {
  filePath: string;
  fileName: string;
  directory: string;
};

export function resolveSavedLabelsPdfPath(saved: SavedLabelsPdf): string {
  if (saved.directory && saved.fileName) {
    const directory = saved.directory.replace(/\/+$/, "");
    return `${directory}/${saved.fileName}`;
  }

  return saved.filePath;
}

export function buildLabelsPdfFilename(teamName: string): string {
  const slug =
    teamName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "items";

  return `labels-${slug}-${new Date().toISOString().split("T")[0]}.pdf`;
}

export async function saveLabelsPdfFile(
  filename: string,
  pdfBytes: Uint8Array
): Promise<SavedLabelsPdf> {
  if (!isTauri()) {
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(objectUrl);

    return {
      filePath: filename,
      fileName: filename,
      directory: "",
    };
  }

  const result = await invoke<ServiceResult<SavedLabelsPdf>>(
    "save_labels_pdf",
    {
      filename,
      data: Array.from(pdfBytes),
    }
  );

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.data;
}

async function invokeLabelsFileAction(
  command: "open_labels_pdf" | "reveal_labels_pdf",
  saved: SavedLabelsPdf
): Promise<void> {
  const result = await invoke<ServiceResult<null>>(command, {
    filePath: resolveSavedLabelsPdfPath(saved),
    fileName: saved.fileName,
  });
  if (!result.ok) {
    throw new Error(result.error.message);
  }
}

export async function openLabelsPdfFile(saved: SavedLabelsPdf): Promise<void> {
  if (!isTauri()) {
    throw new Error("Opening PDF files is only available in the desktop app.");
  }

  await invokeLabelsFileAction("open_labels_pdf", saved);
}

export async function revealLabelsPdfInDir(
  saved: SavedLabelsPdf
): Promise<void> {
  if (!isTauri()) {
    throw new Error("Reveal in folder is only available in the desktop app.");
  }

  await invokeLabelsFileAction("reveal_labels_pdf", saved);
}
