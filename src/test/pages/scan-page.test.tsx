import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "@/api/desktop-api";
import { I18nProvider } from "@/lib/i18n";
import { TeamScanPage } from "@/pages/team/TeamScanPage";

vi.mock("@/api/desktop-api", () => ({
  getTeam: vi.fn(),
  listTeamItems: vi.fn(),
}));

vi.mock("@/components/BarcodeScannerModal", () => ({
  BarcodeScannerModal: ({
    isOpen,
    onScan,
  }: {
    isOpen: boolean;
    onScan: (barcode: string) => void;
  }) =>
    isOpen ? (
      <button type="button" onClick={() => onScan("12345678")}>
        Mock scan
      </button>
    ) : null,
}));

describe("TeamScanPage", () => {
  beforeEach(() => {
    vi.mocked(api.getTeam).mockResolvedValue({
      ok: true,
      data: {
        team: {
          id: 1,
          name: "Ops",
          notes: null,
          labelCompanyInfo: null,
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
            barcode: "12345678",
            currentStock: 5,
            locationName: "Main",
            locationId: 1,
            initialQuantity: 5,
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

  it("renders scan page with lookup controls", async () => {
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/teams/1/scan"]}>
          <Routes>
            <Route path="/teams/:teamId/scan" element={<TeamScanPage />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    );

    expect(
      await screen.findByRole("heading", { name: "Consulta por QR" })
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Abrir Scanner" }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByPlaceholderText("Digite o código ou escaneie")
    ).toBeInTheDocument();
  });

  it("opens item summary after manual lookup", async () => {
    const user = userEvent.setup();

    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/teams/1/scan"]}>
          <Routes>
            <Route path="/teams/:teamId/scan" element={<TeamScanPage />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    );

    await screen.findByRole("heading", { name: "Consulta por QR" });
    await user.type(
      screen.getByPlaceholderText("Digite o código ou escaneie"),
      "12345678"
    );
    await user.click(screen.getByRole("button", { name: "Consultar" }));

    expect(screen.getByText("Resumo do item")).toBeInTheDocument();
    expect(screen.getByText("Printer")).toBeInTheDocument();
  });

  it("opens item summary from scanner", async () => {
    const user = userEvent.setup();

    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/teams/1/scan"]}>
          <Routes>
            <Route path="/teams/:teamId/scan" element={<TeamScanPage />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    );

    await screen.findByRole("heading", { name: "Consulta por QR" });
    await user.click(
      screen.getAllByRole("button", { name: "Abrir Scanner" })[0]
    );
    await user.click(screen.getByRole("button", { name: "Mock scan" }));

    expect(screen.getByText("Resumo do item")).toBeInTheDocument();
    expect(screen.getByText("Printer")).toBeInTheDocument();
  });
});