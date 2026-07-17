import { describe, expect, it } from "vitest";
import type { useTranslation } from "@/lib/i18n";
import {
  formatTransactionQuantity,
  getTransactionTypeColor,
  getTransactionTypeLabel,
} from "@/lib/transactions/getTransactionType";

describe("getTransactionType", () => {
  const t = {
    transactions: {
      stockIn: "Entrada de estoque",
      stockOut: "Saída de estoque",
      adjust: "Ajustar",
      move: "Mover",
      count: "Contar",
      interTeamTransfer: "Transferência entre times",
    },
  } as ReturnType<typeof useTranslation>["t"];

  it("returns translated labels and colors per transaction type", () => {
    expect(getTransactionTypeLabel("stock_in", t)).toBe("Entrada de estoque");
    expect(getTransactionTypeLabel("stock_out", t)).toBe("Saída de estoque");
    expect(getTransactionTypeColor("stock_in")).toContain("green");
    expect(getTransactionTypeColor("stock_out")).toContain("red");
    expect(getTransactionTypeColor("move")).toContain("blue");
  });

  it("formats quantity with sign for stock in and stock out", () => {
    expect(formatTransactionQuantity(1, "stock_in")).toBe("+1");
    expect(formatTransactionQuantity(2, "stock_out")).toBe("-2");
    expect(formatTransactionQuantity(3, "move")).toBe("3");
  });
});