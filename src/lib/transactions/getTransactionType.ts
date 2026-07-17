import type { useTranslation } from "@/lib/i18n";
import type { StockTransactionDto } from "@/services/types";

export function isInterTeamTransfer(transaction: StockTransactionDto): boolean {
  return (
    transaction.destinationKind === "team" &&
    (transaction.transactionType === "stock_in" ||
      transaction.transactionType === "stock_out")
  );
}

export function getTransactionTypeLabel(
  type: string,
  t: ReturnType<typeof useTranslation>["t"],
  transaction?: StockTransactionDto
): string {
  if (transaction && isInterTeamTransfer(transaction)) {
    return t.transactions.interTeamTransfer;
  }

  switch (type) {
    case "stock_in":
      return t.transactions.stockIn;
    case "stock_out":
      return t.transactions.stockOut;
    case "adjust":
      return t.transactions.adjust;
    case "move":
      return t.transactions.move;
    case "count":
      return t.transactions.count;
    default:
      return type;
  }
}

export function getTransactionTypeColor(
  type: string,
  transaction?: StockTransactionDto
): string {
  if (transaction && isInterTeamTransfer(transaction)) {
    return "bg-violet-100 text-violet-800 border-violet-200";
  }

  switch (type) {
    case "stock_in":
      return "bg-green-100 text-green-800 border-green-200";
    case "stock_out":
      return "bg-red-100 text-red-800 border-red-200";
    case "adjust":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "move":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export function formatTransactionQuantity(
  quantity: number,
  type: string
): string {
  if (type === "stock_out") {
    return `-${quantity}`;
  }
  if (type === "stock_in") {
    return `+${quantity}`;
  }
  return String(quantity);
}