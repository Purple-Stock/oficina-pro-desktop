import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "@/api/desktop-api";
import { I18nProvider } from "@/lib/i18n";
import { TeamStockOutPage } from "@/pages/team/TeamStockOutPage";

vi.mock("@/api/desktop-api", () => ({
  getTeam: vi.fn(),
  listTeamItems: vi.fn(),
  listTeamLocations: vi.fn(),
  createTeamStockTransaction: vi.fn(),
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

describe("TeamStockOutPage", () => {
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
          transactionType: "stock_out",
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

  it("renders stock out page with scanner", async () => {
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/teams/1/stock-out"]}>
          <Routes>
            <Route path="/teams/:teamId/stock-out" element={<TeamStockOutPage />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    );

    expect(
      await screen.findByRole("heading", { name: "Saída de estoque" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Escanear código de barras/i })
    ).toBeInTheDocument();
  });

  it("submits stock out after scanning item", async () => {
    const user = userEvent.setup();

    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/teams/1/stock-out"]}>
          <Routes>
            <Route path="/teams/:teamId/stock-out" element={<TeamStockOutPage />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    );

    await screen.findByRole("heading", { name: "Saída de estoque" });
    await user.click(
      screen.getByRole("button", { name: /Escanear código de barras/i })
    );
    await user.click(screen.getByRole("button", { name: "Mock scan" }));
    await user.click(screen.getByRole("button", { name: "Remover estoque" }));

    expect(api.createTeamStockTransaction).toHaveBeenCalledWith(1, {
      itemId: 1,
      transactionType: "stock_out",
      quantity: 1,
      destinationLocationId: 1,
      notes: null,
    });
  });
});