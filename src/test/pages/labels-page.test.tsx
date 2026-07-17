import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "@/api/desktop-api";
import { I18nProvider } from "@/lib/i18n";
import { TeamLabelsPage } from "@/pages/team/TeamLabelsPage";

vi.mock("@/api/desktop-api", () => ({
  getTeam: vi.fn(),
  listTeamItems: vi.fn(),
}));

vi.mock("@/lib/labels/generate-labels-pdf", () => ({
  generateLabelsPdf: vi.fn(),
}));

vi.mock("@/lib/labels/save-labels-pdf-file", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/labels/save-labels-pdf-file")
  >();

  return {
    ...actual,
    buildLabelsPdfFilename: vi.fn(() => "labels-ops-2026-07-15.pdf"),
    saveLabelsPdfFile: vi.fn(async () => ({
      filePath:
        "/Users/test/Downloads/Oficina Pro/labels/labels-ops-2026-07-15.pdf",
      fileName: "labels-ops-2026-07-15.pdf",
      directory: "/Users/test/Downloads/Oficina Pro/labels",
    })),
    openLabelsPdfFile: vi.fn(),
    revealLabelsPdfInDir: vi.fn(),
  };
});

vi.mock("@/components/QRCodeDisplay", () => ({
  QRCodeDisplay: ({ value }: { value: string }) => (
    <div data-testid="qr-preview">{value}</div>
  ),
}));

describe("TeamLabelsPage", () => {
  beforeEach(async () => {
    const { generateLabelsPdf } = await import("@/lib/labels/generate-labels-pdf");
    vi.mocked(generateLabelsPdf).mockResolvedValue({
      labelCount: 2,
      itemCount: 2,
      invalidBarcodeCount: 0,
      logoLoadFailed: false,
      fileName: "labels-ops-2026-07-15.pdf",
      pdfBytes: new Uint8Array([1, 2, 3]),
    });

    vi.mocked(api.getTeam).mockResolvedValue({
      ok: true,
      data: {
        team: {
          id: 1,
          name: "Ops",
          notes: null,
          labelCompanyInfo: "Oficina Pro",
          labelLogoUrl: null,
          itemCustomFieldSchema: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          canDeleteTeam: true,
        },
      },
    });
    vi.mocked(api.listTeamItems).mockResolvedValue({
      ok: true,
      data: {
        items: [
          {
            id: 1,
            name: "Printer",
            sku: "PR-1",
            barcode: "5901234123457",
            currentStock: 5,
            locationName: "Main",
            locationId: 1,
            initialQuantity: 5,
            minimumStock: 0,
            teamId: 1,
            cost: null,
            price: 120,
            itemType: null,
            brand: null,
            photoData: null,
            customFields: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 2,
            name: "Cable",
            sku: "CB-2",
            barcode: "7901234123457",
            currentStock: 12,
            locationName: "Warehouse",
            locationId: 2,
            initialQuantity: 12,
            minimumStock: 0,
            teamId: 1,
            cost: null,
            price: null,
            itemType: null,
            brand: null,
            photoData: null,
            customFields: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      },
    });
  });

  it("renders labels page with item selection controls", async () => {
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/teams/1/labels"]}>
          <Routes>
            <Route path="/teams/:teamId/labels" element={<TeamLabelsPage />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    );

    expect(
      await screen.findByRole("heading", { name: "Etiquetas" })
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Buscar itens...")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Selecionar Todos" })
    ).toBeInTheDocument();
    expect(screen.getAllByText("Printer").length).toBeGreaterThan(0);
  });

  it("generates PDF for selected items", async () => {
    const user = userEvent.setup();
    const { generateLabelsPdf } = await import("@/lib/labels/generate-labels-pdf");

    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/teams/1/labels"]}>
          <Routes>
            <Route path="/teams/:teamId/labels" element={<TeamLabelsPage />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    );

    await screen.findByRole("heading", { name: "Etiquetas" });
    await user.click(screen.getByRole("button", { name: "Selecionar Todos" }));
    await user.click(screen.getAllByRole("button", { name: "Gerar PDF" })[0]);

    await waitFor(() => expect(generateLabelsPdf).toHaveBeenCalled());
    const { saveLabelsPdfFile } = await import("@/lib/labels/save-labels-pdf-file");
    const feedback = await screen.findByRole("status");
    expect(feedback).toHaveTextContent("PDF gerado");
    expect(feedback).toHaveTextContent("2 etiqueta(s) para 2 item(ns)");
    expect(feedback).toHaveTextContent("Arquivo salvo em:");
    expect(feedback).toHaveTextContent("labels-ops-2026-07-15.pdf");
    expect(
      screen.getByRole("button", { name: "Abrir PDF" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Mostrar na pasta" })
    ).toBeInTheDocument();
    expect(saveLabelsPdfFile).toHaveBeenCalled();
  });

  it("opens the saved pdf using the resolved labels folder path", async () => {
    const user = userEvent.setup();
    const { openLabelsPdfFile } = await import("@/lib/labels/save-labels-pdf-file");

    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/teams/1/labels"]}>
          <Routes>
            <Route path="/teams/:teamId/labels" element={<TeamLabelsPage />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    );

    await screen.findByRole("heading", { name: "Etiquetas" });
    await user.click(screen.getByRole("button", { name: "Selecionar Todos" }));
    await user.click(screen.getAllByRole("button", { name: "Gerar PDF" })[0]);
    await screen.findByRole("status");

    await user.click(screen.getByRole("button", { name: "Abrir PDF" }));

    await waitFor(() =>
      expect(openLabelsPdfFile).toHaveBeenCalledWith({
        filePath:
          "/Users/test/Downloads/Oficina Pro/labels/labels-ops-2026-07-15.pdf",
        fileName: "labels-ops-2026-07-15.pdf",
        directory: "/Users/test/Downloads/Oficina Pro/labels",
      })
    );
  });
});