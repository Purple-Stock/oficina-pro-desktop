import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "@/api/desktop-api";
import { I18nProvider } from "@/lib/i18n";
import { TeamItemsPage } from "@/pages/team/TeamItemsPage";

vi.mock("@/api/desktop-api", () => ({
  getTeam: vi.fn(),
  listTeamItems: vi.fn(),
  updateTeamItem: vi.fn(),
  deleteTeamItem: vi.fn(),
}));

describe("TeamItemsPage", () => {
  beforeEach(() => {
    vi.mocked(api.getTeam).mockResolvedValue({
      ok: true,
      data: {
        team: {
          id: 1,
          name: "teste",
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
      data: { items: [] },
    });
  });

  it("renders web-style empty state in Portuguese", async () => {
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/teams/1/items"]}>
          <Routes>
            <Route path="/teams/:teamId/items" element={<TeamItemsPage />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Itens")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Gerencie os itens do seu inventário")
    ).toBeInTheDocument();
    expect(screen.getByText("Nenhum item encontrado")).toBeInTheDocument();
    expect(
      screen.getByText("Comece adicionando seu primeiro item")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Adicionar seu primeiro item/i })
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Buscar itens...")).toBeInTheDocument();
  });
});
