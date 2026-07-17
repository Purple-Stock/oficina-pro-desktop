import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ClipboardList, Plus } from "lucide-react";
import * as api from "@/api/desktop-api";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/formatPrice";
import {
  accentButton,
  primaryGradientIconCircle,
} from "@/lib/styles";
import type { ServiceOrderDto, TeamDto } from "@/services/types";

const STATUS_LABEL: Record<string, string> = {
  open: "Aberta",
  in_progress: "Em andamento",
  waiting_parts: "Aguardando peças",
  done: "Concluída",
  closed: "Fechada",
  cancelled: "Cancelada",
};

export function TeamServiceOrdersPage() {
  const { teamId = "" } = useParams();
  const id = Number(teamId);
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [orders, setOrders] = useState<ServiceOrderDto[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const teamResult = await api.getTeam(id);
    if (teamResult.ok) setTeam(teamResult.data.team);
    const ordersResult = await api.listTeamServiceOrders(id);
    if (ordersResult.ok) setOrders(ordersResult.data.serviceOrders);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter(
      (order) =>
        String(order.id).includes(query) ||
        order.clientName?.toLowerCase().includes(query) ||
        order.vehiclePlate?.toLowerCase().includes(query) ||
        order.status.toLowerCase().includes(query)
    );
  }, [orders, searchQuery]);

  const handleCreate = async () => {
    setCreating(true);
    const result = await api.createTeamServiceOrder(id, { status: "open" });
    setCreating(false);
    if (result.ok) {
      window.location.href = `/teams/${teamId}/service-orders/${result.data.serviceOrder.id}`;
    }
  };

  if (!team) return <div className="p-8">Carregando...</div>;

  return (
    <TeamLayout team={team} activeMenuItem="service-orders">
      <PageHeader
        title="Ordens de Serviço"
        subtitle="Controle OS, peças e mão de obra"
        actions={
          <Button
            className={`${accentButton} h-10 sm:h-11 text-sm`}
            onClick={() => void handleCreate()}
            disabled={creating}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova OS
          </Button>
        }
      />

      <div className="mb-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Buscar por nº, cliente, placa ou status..."
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          iconClassName={primaryGradientIconCircle}
          title="Nenhuma ordem de serviço"
          message="Crie a primeira OS para começar o atendimento."
          action={
            <Button
              className={accentButton}
              onClick={() => void handleCreate()}
              disabled={creating}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova OS
            </Button>
          }
        />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">
                  OS
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">
                  Cliente / Placa
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">
                  Status
                </th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-gray-100 hover:bg-blue-50/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/teams/${teamId}/service-orders/${order.id}`}
                      className="font-semibold text-[#1D4ED8] hover:underline"
                    >
                      #{order.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-800">
                    <div>{order.clientName || "Sem cliente"}</div>
                    <div className="text-xs text-gray-500">
                      {order.vehiclePlate || "Sem placa"}
                      {order.vehicleLabel ? ` · ${order.vehicleLabel}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                      {STATUS_LABEL[order.status] || order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatPrice(order.total, "pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </TeamLayout>
  );
}
