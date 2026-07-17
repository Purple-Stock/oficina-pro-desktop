import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { I18nProvider } from "@/lib/i18n";

describe("DeleteConfirmModal", () => {
  it("opens confirmation dialog and calls onConfirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <I18nProvider>
        <DeleteConfirmModal
          isOpen
          onClose={onClose}
          onConfirm={onConfirm}
          title="Excluir time"
          itemName="Ops Team"
        />
      </I18nProvider>
    );

    expect(screen.getByText("Excluir time")).toBeInTheDocument();
    expect(screen.getByText('Excluir "Ops Team"?')).toBeInTheDocument();
    expect(screen.getByText("Ops Team")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Excluir" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when cancel is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <I18nProvider>
        <DeleteConfirmModal
          isOpen
          onClose={onClose}
          onConfirm={vi.fn()}
          description="Tem certeza que deseja excluir este item?"
        />
      </I18nProvider>
    );

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
