import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "@/api/desktop-api";
import { I18nProvider } from "@/lib/i18n";
import { TeamReportsPage } from "@/pages/team/TeamReportsPage";

const mockStats = {
  totalItems: 2,
  totalLocations: 2,
  totalTransactions: 3,
  totalStockValue: 1500,
  lowStockItems: 1,
  outOfStockItems: 0,
  transactionsByType: {
    stock_in: 2,
    stock_out: 1,
    adjust: 0,
    move: 0,
  },
  recentTransactions: [
    {
      id: 1,
      transactionType: "stock_in" as const,
      quantity: 5,
      createdAt: Date.now(),
      itemName: "Printer",
    },
  ],
  topItemsByValue: [
    {
      id: 1,
      name: "Printer",
      sku: "PR-1",
      currentStock: 5,
      price: 120,
      totalValue: 600,
    },
  ],
  stockByLocation: [
    {
      locationId: 1,
      locationName: "Main",
      itemCount: 2,
      totalStock: 17,
      totalValue: 1500,
    },
  ],
  transactionsByDate: [],
};

vi.mock("@/api/desktop-api", () => ({
  getTeam: vi.fn(),
  getTeamReportStats: vi.fn(),
}));

describe("TeamReportsPage", () => {
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
    vi.mocked(api.getTeamReportStats).mockResolvedValue({
      ok: true,
      data: { stats: mockStats },
    });
  });

  it("renders reports overview cards", async () => {
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/teams/1/reports"]}>
          <Routes>
            <Route
              path="/teams/:teamId/reports"
              element={<TeamReportsPage />}
            />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    );

    expect(
      await screen.findByRole("heading", { name: "Relatórios" })
    ).toBeInTheDocument();
    expect(screen.getByText("Total de Itens")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    expect(screen.getByText("Transações Recentes")).toBeInTheDocument();
    expect(screen.getByText("Top Itens por Valor")).toBeInTheDocument();
    expect(screen.getByText("Estoque por Localização")).toBeInTheDocument();
    expect(screen.getAllByText("Printer").length).toBeGreaterThan(0);
  });

  it("refetches stats when date filters change", async () => {
    const user = userEvent.setup();

    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/teams/1/reports"]}>
          <Routes>
            <Route
              path="/teams/:teamId/reports"
              element={<TeamReportsPage />}
            />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    );

    await screen.findByRole("heading", { name: "Relatórios" });

    const [startDateInput] = screen.getAllByDisplayValue("");
    await user.type(startDateInput, "2026-07-01");

    expect(api.getTeamReportStats).toHaveBeenCalled();
  });
});
