import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "@/api/desktop-api";
import { I18nProvider } from "@/lib/i18n";
import { TeamStockInPage } from "@/pages/team/TeamStockInPage";

vi.mock("@/api/desktop-api", () => ({
  getTeam: vi.fn(),
  listTeamItems: vi.fn(),
  listTeamLocations: vi.fn(),
  createTeamStockTransaction: vi.fn(),
  createTeamItem: vi.fn(),
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

describe("TeamStockInPage", () => {
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
    vi.mocked(api.listTeamLocations).mockResolvedValue({
      ok: true,
      data: {
        locations: [
          {
            id: 1,
            name: "Main",
            description: null,
            teamId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      },
    });
    vi.mocked(api.createTeamStockTransaction).mockResolvedValue({
      ok: true,
      data: {
        transaction: {
          id: 1,
          itemId: 1,
          teamId: 1,
          transactionType: "stock_in",
          quantity: 1,
          notes: null,
          sourceLocationId: null,
          destinationLocationId: 1,
          destinationKind: null,
          destinationLabel: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    });
  });

  it("renders web-style stock in page with scanner button", async () => {
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/teams/1/stock-in"]}>
          <Routes>
            <Route path="/teams/:teamId/stock-in" element={<TeamStockInPage />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    );

    expect(
      await screen.findByRole("heading", { name: "Entrada de estoque" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Escanear código de barras/i })
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Buscar um item")).toBeInTheDocument();
  });

  it("adds item from scanner and submits stock in", async () => {
    const user = userEvent.setup();

    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/teams/1/stock-in"]}>
          <Routes>
            <Route path="/teams/:teamId/stock-in" element={<TeamStockInPage />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    );

    await screen.findByRole("heading", { name: "Entrada de estoque" });
    await user.click(
      screen.getByRole("button", { name: /Escanear código de barras/i })
    );
    await user.click(screen.getByRole("button", { name: "Mock scan" }));

    expect(screen.getByText("Printer")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Adicionar estoque" }));

    expect(api.createTeamStockTransaction).toHaveBeenCalledWith(1, {
      itemId: 1,
      transactionType: "stock_in",
      quantity: 1,
      destinationLocationId: 1,
      notes: null,
    });
  });
});