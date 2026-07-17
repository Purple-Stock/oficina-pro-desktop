import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import * as api from "@/api/desktop-api";
import { I18nProvider } from "@/lib/i18n";
import { TeamSelectionPage } from "@/pages/TeamSelectionPage";

vi.mock("@/api/desktop-api", () => ({
  initDatabase: vi.fn().mockResolvedValue(undefined),
  listTeams: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      teams: [
        {
          id: 1,
          name: "Ops Team",
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          itemCount: 0,
          transactionCount: 0,
          canDeleteTeam: true,
        },
      ],
    },
  }),
  updateTeam: vi.fn().mockResolvedValue({
    ok: true,
    data: { team: { id: 1, name: "Ops Updated", notes: null } },
  }),
  deleteTeam: vi.fn().mockResolvedValue({ ok: true, data: null }),
}));

describe("TeamSelectionPage edit flow", () => {
  it("opens edit modal from team card and calls updateTeam", async () => {
    const user = userEvent.setup();

    render(
      <I18nProvider>
        <MemoryRouter>
          <TeamSelectionPage />
        </MemoryRouter>
      </I18nProvider>
    );

    await screen.findByText("Ops Team");
    const editButtons = screen.getAllByLabelText("Editar");
    await user.click(editButtons[0]);

    expect(screen.getByText("Editar oficina")).toBeInTheDocument();

    const nameInput = screen.getByDisplayValue("Ops Team");
    await user.clear(nameInput);
    await user.type(nameInput, "Ops Updated");
    await user.click(screen.getByRole("button", { name: "Atualizar oficina" }));

    expect(api.updateTeam).toHaveBeenCalledWith(1, {
      name: "Ops Updated",
      notes: null,
    });
  });

  it("opens delete modal before deleting a team", async () => {
    const user = userEvent.setup();

    render(
      <I18nProvider>
        <MemoryRouter>
          <TeamSelectionPage />
        </MemoryRouter>
      </I18nProvider>
    );

    await screen.findByText("Ops Team");
    await user.click(screen.getByLabelText("Excluir"));

    expect(screen.getByText("Excluir oficina")).toBeInTheDocument();
    expect(screen.getByText('Excluir "Ops Team"?')).toBeInTheDocument();
    expect(api.deleteTeam).not.toHaveBeenCalled();

    const deleteButtons = screen.getAllByRole("button", { name: "Excluir" });
    await user.click(deleteButtons[deleteButtons.length - 1]);
    expect(api.deleteTeam).toHaveBeenCalledWith(1);
  });
});
