import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "@/api/desktop-api";
import { I18nProvider } from "@/lib/i18n";
import { TeamSettingsPage } from "@/pages/team/TeamSettingsPage";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom"
    );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/api/desktop-api", () => ({
  getTeam: vi.fn(),
  updateTeam: vi.fn(),
  exportFullBackup: vi.fn(),
  deleteAllData: vi.fn(),
  importTeamBackup: vi.fn(),
  previewTeamItemsCsv: vi.fn(),
  importTeamItemsCsv: vi.fn(),
}));

describe("TeamSettingsPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    vi.mocked(api.deleteAllData).mockResolvedValue({
      ok: true,
      data: { deletedTeams: 1 },
    });
    vi.mocked(api.getTeam).mockResolvedValue({
      ok: true,
      data: {
        team: {
          id: 1,
          name: "Ops",
          notes: "Local team",
          labelCompanyInfo: "Oficina Pro",
          labelLogoUrl: null,
          itemCustomFieldSchema: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          canDeleteTeam: true,
        },
      },
    });
    vi.mocked(api.updateTeam).mockResolvedValue({
      ok: true,
      data: {
        team: {
          id: 1,
          name: "Ops Updated",
          notes: "Local team",
          labelCompanyInfo: "Oficina Pro",
          labelLogoUrl: null,
          itemCustomFieldSchema: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          canDeleteTeam: true,
        },
      },
    });
  });

  it("renders desktop settings tabs", async () => {
    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/teams/1/settings"]}>
          <Routes>
            <Route
              path="/teams/:teamId/settings"
              element={<TeamSettingsPage />}
            />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    );

    expect(
      await screen.findByRole("heading", { name: "Configurações" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Geral" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Etiquetas" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Campos customizáveis" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Importar e exportar" })
    ).toBeInTheDocument();
  });

  it("saves general team settings", async () => {
    const user = userEvent.setup();

    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/teams/1/settings"]}>
          <Routes>
            <Route
              path="/teams/:teamId/settings"
              element={<TeamSettingsPage />}
            />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    );

    await screen.findByRole("heading", { name: "Configurações" });
    const nameInput = screen.getByPlaceholderText("Digite o nome do time");
    await user.clear(nameInput);
    await user.type(nameInput, "Ops Updated");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(api.updateTeam).toHaveBeenCalledWith(1, {
      name: "Ops Updated",
      notes: "Local team",
    });
  });

  it("shows import and export actions", async () => {
    const user = userEvent.setup();

    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/teams/1/settings"]}>
          <Routes>
            <Route
              path="/teams/:teamId/settings"
              element={<TeamSettingsPage />}
            />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    );

    await screen.findByRole("heading", { name: "Configurações" });
    await user.click(
      screen.getByRole("button", { name: "Importar e exportar" })
    );

    expect(
      screen.getByRole("button", { name: "Exportar JSON geral" })
    ).toBeInTheDocument();
    expect(screen.getAllByText("Importar itens CSV").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: "Excluir tudo" })
    ).toBeInTheDocument();
  });

  it("deletes all data after confirmation", async () => {
    const user = userEvent.setup();

    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/teams/1/settings"]}>
          <Routes>
            <Route
              path="/teams/:teamId/settings"
              element={<TeamSettingsPage />}
            />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    );

    await screen.findByRole("heading", { name: "Configurações" });
    await user.click(
      screen.getByRole("button", { name: "Importar e exportar" })
    );
    await user.click(screen.getByRole("button", { name: "Excluir tudo" }));

    expect(
      screen.getByText(
        "Tem certeza que deseja excluir tudo? Todos os times, localizações, itens e transações serão removidos permanentemente."
      )
    ).toBeInTheDocument();

    const confirmButtons = screen.getAllByRole("button", {
      name: "Excluir tudo",
    });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    expect(api.deleteAllData).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith("/");
  });
});
