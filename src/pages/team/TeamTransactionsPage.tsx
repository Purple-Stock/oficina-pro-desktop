import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeftRight } from "lucide-react";
import * as api from "@/api/desktop-api";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { purpleGradientIconCircle } from "@/lib/styles";
import { useTranslation } from "@/lib/i18n";
import {
  formatTransactionQuantity,
  getTransactionTypeColor,
  getTransactionTypeLabel,
} from "@/lib/transactions/getTransactionType";
import type { StockTransactionDto, TeamDto } from "@/services/types";

export function TeamTransactionsPage() {
  const { teamId = "" } = useParams();
  const { t } = useTranslation();
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [transactions, setTransactions] = useState<StockTransactionDto[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const id = Number(teamId);
    void (async () => {
      const teamResult = await api.getTeam(id);
      if (teamResult.ok) setTeam(teamResult.data.team);
      const txResult = await api.listTeamTransactions(id);
      if (txResult.ok) setTransactions(txResult.data.transactions);
    })();
  }, [teamId]);

  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    const query = searchQuery.toLowerCase();
    return transactions.filter(
      (tx) =>
        tx.itemName?.toLowerCase().includes(query) ||
        tx.transactionType.toLowerCase().includes(query) ||
        tx.notes?.toLowerCase().includes(query)
    );
  }, [transactions, searchQuery]);

  const isSearchActive = searchQuery.trim().length > 0;
  const isEmpty = filteredTransactions.length === 0;

  if (!team) return <div className="p-8">{t.common.loading}</div>;

  return (
    <TeamLayout team={team} activeMenuItem="transactions">
      <PageHeader
        title={t.stock.transactionsTitle}
        subtitle={t.stock.transactionsSubtitle}
      />

      <div className="mb-4 sm:mb-6">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t.common.search}
        />
      </div>

      {isEmpty ? (
        <EmptyState
          icon={ArrowLeftRight}
          iconClassName={purpleGradientIconCircle}
          title={
            isSearchActive ? t.stock.noTransactions : t.stock.noTransactions
          }
          message={
            isSearchActive
              ? t.items.noItemsSearchMessage
              : t.stock.noTransactionsMessage
          }
        />
      ) : (
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    {t.items.item}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    {t.transactions.type}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    {t.stock.quantity}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    {t.stock.notes}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-blue-50/50 transition-colors"
                  >
                    <td className="px-6 py-5 text-sm font-semibold text-gray-900">
                      {tx.itemName ?? "—"}
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getTransactionTypeColor(
                          tx.transactionType,
                          tx
                        )}`}
                      >
                        {getTransactionTypeLabel(tx.transactionType, t, tx)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-gray-900">
                      {formatTransactionQuantity(
                        tx.quantity,
                        tx.transactionType
                      )}
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-600">
                      {tx.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </TeamLayout>
  );
}
