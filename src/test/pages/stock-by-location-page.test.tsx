import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "@/api/desktop-api";
import { I18nProvider } from "@/lib/i18n";
import { TeamStockByLocationPage } from "@/pages/team/TeamStockByLocationPage";

vi.mock("@/api/desktop-api", () => ({
  getTeam: vi.fn(),
  listTeamItems: vi.fn(),
  listTeamLocations: vi.fn(),
}));

describe("TeamStockByLocationPage", () => {
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
          {
            id: 2,
            name: "Warehouse",
            description: null,
            teamId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
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
            barcode: "87654321",
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

  it("renders stock grouped by location", async () => {
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/teams/1/stock-by-location"]}>
          <Routes>
            <Route
              path="/teams/:teamId/stock-by-location"
              element={<TeamStockByLocationPage />}
            />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    );

    expect(
      await screen.findByRole("heading", { name: "Estoque por Localização" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Main" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Warehouse" })
    ).toBeInTheDocument();
    expect(screen.getByText("Printer")).toBeInTheDocument();
    expect(screen.getByText("Cable")).toBeInTheDocument();
  });

  it("filters items by search query", async () => {
    const user = userEvent.setup();

    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/teams/1/stock-by-location"]}>
          <Routes>
            <Route
              path="/teams/:teamId/stock-by-location"
              element={<TeamStockByLocationPage />}
            />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    );

    await screen.findByRole("heading", { name: "Estoque por Localização" });
    await user.type(
      screen.getByPlaceholderText("Buscar itens ou localizações..."),
      "Printer"
    );

    expect(screen.getByText("Printer")).toBeInTheDocument();
    expect(screen.queryByText("Cable")).not.toBeInTheDocument();
  });
});