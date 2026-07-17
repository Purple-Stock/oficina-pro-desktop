import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { TeamLayout } from "../../components/shared/TeamLayout";
import { I18nProvider } from "../../lib/i18n";

const menuLabels = [
  "Ordens de serviço",
  "Clientes",
  "Veículos",
  "Peças",
  "Serviços",
  "Localizações",
  "Entrada",
  "Saída",
  "Ajuste",
  "Movimentar",
  "Transações",
  "Escanear",
  "Estoque por local",
  "Etiquetas",
  "Relatórios",
  "Configurações",
];

describe("TeamLayout", () => {
  it("renders oficina pro branding and workshop menu", () => {
    const { container } = render(
      <I18nProvider>
        <MemoryRouter>
          <TeamLayout team={{ id: 1, name: "Oficina Centro" }} activeMenuItem="items">
            <div>Page content</div>
          </TeamLayout>
        </MemoryRouter>
      </I18nProvider>
    );

    expect(screen.getByText("OFICINA PRO")).toBeInTheDocument();
    expect(screen.getAllByText("Oficina Centro").length).toBeGreaterThan(0);
    for (const label of menuLabels) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("Page content")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass(
      "bg-gradient-to-br",
      "from-slate-50"
    );
  });
});
