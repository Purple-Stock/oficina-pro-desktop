import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RouteChangeSpinner } from "@/components/RouteChangeSpinner";
import { I18nProvider } from "@/lib/i18n";

function NavTrigger() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate("/teams/new")}>
      Go
    </button>
  );
}

describe("RouteChangeSpinner", () => {
  it("shows spinner when route changes", async () => {
    vi.useFakeTimers();

    render(
      <I18nProvider>
        <MemoryRouter initialEntries={["/"]}>
          <RouteChangeSpinner />
          <Routes>
            <Route path="/" element={<NavTrigger />} />
            <Route path="/teams/new" element={<div>New team page</div>} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await act(async () => {
      screen.getByRole("button", { name: "Go" }).click();
    });

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Carregando...")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
