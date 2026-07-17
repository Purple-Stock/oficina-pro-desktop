import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import * as api from "@/api/desktop-api";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/formatPrice";
import {
  accentButton,
  formSelectClass,
  primaryGradientButton,
} from "@/lib/styles";
import type {
  ClientDto,
  ItemDto,
  ServiceOrderDto,
  TeamDto,
  VehicleDto,
  WorkshopServiceDto,
} from "@/services/types";
import { normalizeItemDto } from "@/lib/normalizeItem";

const STATUS_OPTIONS = [
  { value: "open", label: "Aberta" },
  { value: "in_progress", label: "Em andamento" },
  { value: "waiting_parts", label: "Aguardando peças" },
  { value: "done", label: "Concluída" },
  { value: "closed", label: "Fechada" },
  { value: "cancelled", label: "Cancelada" },
];

export function TeamServiceOrderDetailPage() {
  const { teamId = "", orderId = "" } = useParams();
  const id = Number(teamId);
  const osId = Number(orderId);
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [order, setOrder] = useState<ServiceOrderDto | null>(null);
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [services, setServices] = useState<WorkshopServiceDto[]>([]);
  const [parts, setParts] = useState<ItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedPartId, setSelectedPartId] = useState("");
  const [partQty, setPartQty] = useState("1");

  const load = async () => {
    const teamResult = await api.getTeam(id);
    if (teamResult.ok) setTeam(teamResult.data.team);
    const orderResult = await api.getTeamServiceOrder(id, osId);
    if (orderResult.ok) setOrder(orderResult.data.serviceOrder);
    const clientsResult = await api.listTeamClients(id);
    if (clientsResult.ok) setClients(clientsResult.data.clients);
    const vehiclesResult = await api.listTeamVehicles(id);
    if (vehiclesResult.ok) setVehicles(vehiclesResult.data.vehicles);
    const servicesResult = await api.listTeamWorkshopServices(id);
    if (servicesResult.ok) setServices(servicesResult.data.services);
    const itemsResult = await api.listTeamItems(id);
    if (itemsResult.ok) {
      setParts(
        itemsResult.data.items.map((entry) =>
          normalizeItemDto(entry as unknown as Record<string, unknown>)
        )
      );
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, orderId]);

  const selectedClientId = order?.clientId ?? null;
  const clientVehicles = selectedClientId
    ? vehicles.filter((vehicle) => vehicle.clientId === selectedClientId)
    : vehicles;

  const isClosed = order?.status === "closed";

  const saveHeader = async (patch: Record<string, unknown>) => {
    setSaving(true);
    setError(null);
    const result = await api.updateTeamServiceOrder(id, osId, patch);
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setOrder(result.data.serviceOrder);
  };

  const addService = async () => {
    const service = services.find(
      (entry) => entry.id === Number(selectedServiceId)
    );
    if (!service) return;
    setError(null);
    const result = await api.addTeamServiceOrderItem(id, osId, {
      kind: "service",
      refId: service.id,
      description: service.name,
      quantity: 1,
      unitPrice: service.price,
    });
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setSelectedServiceId("");
    await load();
  };

  const addPart = async () => {
    const part = parts.find((entry) => entry.id === Number(selectedPartId));
    if (!part) return;
    setError(null);
    const qty = Number(partQty) || 1;
    const result = await api.addTeamServiceOrderItem(id, osId, {
      kind: "part",
      refId: part.id,
      description: part.name || `Peça #${part.id}`,
      quantity: qty,
      unitPrice: part.price ?? 0,
    });
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setSelectedPartId("");
    setPartQty("1");
    await load();
  };

  const removeLine = async (lineId: number) => {
    setError(null);
    const result = await api.removeTeamServiceOrderItem(id, osId, lineId);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    await load();
  };

  if (!team || !order) return <div className="p-8">Carregando...</div>;

  return (
    <TeamLayout team={team} activeMenuItem="service-orders">
      <div className="mb-4">
        <Link
          to={`/teams/${teamId}/service-orders`}
          className="inline-flex items-center text-sm text-[#1D4ED8] hover:underline"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar para OS
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1D4ED8]">
            Ordem de Serviço #{order.id}
          </h1>
          <p className="text-sm text-gray-500">
            Peças + serviços · baixa de estoque ao fechar
          </p>
        </div>
        {!isClosed && (
          <Button
            className={accentButton}
            disabled={saving}
            onClick={() => void saveHeader({ status: "closed" })}
          >
            Fechar OS e baixar estoque
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-900">Dados da OS</h2>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <select
              className={formSelectClass}
              value={order.status}
              disabled={isClosed}
              onChange={(e) => void saveHeader({ status: e.target.value })}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <select
              className={formSelectClass}
              value={order.clientId ?? ""}
              disabled={isClosed}
              onChange={(e) =>
                void saveHeader({
                  clientId: e.target.value ? Number(e.target.value) : null,
                  vehicleId: null,
                })
              }
            >
              <option value="">Sem cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Veículo</Label>
            <select
              className={formSelectClass}
              value={order.vehicleId ?? ""}
              disabled={isClosed}
              onChange={(e) =>
                void saveHeader({
                  vehicleId: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">Sem veículo</option>
              {clientVehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate} —{" "}
                  {[vehicle.brand, vehicle.model].filter(Boolean).join(" ")}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Km atual</Label>
            <Input
              type="number"
              disabled={isClosed}
              value={order.odometer ?? ""}
              onChange={(e) =>
                setOrder({
                  ...order,
                  odometer: e.target.value ? Number(e.target.value) : null,
                })
              }
              onBlur={() => void saveHeader({ odometer: order.odometer })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Reclamação / defeito</Label>
            <Textarea
              disabled={isClosed}
              value={order.complaint ?? ""}
              onChange={(e) =>
                setOrder({ ...order, complaint: e.target.value })
              }
              onBlur={() => void saveHeader({ complaint: order.complaint })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Diagnóstico</Label>
            <Textarea
              disabled={isClosed}
              value={order.diagnosis ?? ""}
              onChange={(e) =>
                setOrder({ ...order, diagnosis: e.target.value })
              }
              onBlur={() => void saveHeader({ diagnosis: order.diagnosis })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Desconto (R$)</Label>
            <Input
              type="number"
              disabled={isClosed}
              value={order.discount}
              onChange={(e) =>
                setOrder({ ...order, discount: Number(e.target.value) || 0 })
              }
              onBlur={() => void saveHeader({ discount: order.discount })}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
            <h2 className="font-semibold text-gray-900">Adicionar serviço</h2>
            <div className="flex gap-2">
              <select
                className={formSelectClass}
                value={selectedServiceId}
                disabled={isClosed}
                onChange={(e) => setSelectedServiceId(e.target.value)}
              >
                <option value="">Selecione um serviço...</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} — {formatPrice(service.price, "pt-BR")}
                  </option>
                ))}
              </select>
              <Button
                className={primaryGradientButton}
                disabled={isClosed || !selectedServiceId}
                onClick={() => void addService()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
            <h2 className="font-semibold text-gray-900">Adicionar peça</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                className={formSelectClass}
                value={selectedPartId}
                disabled={isClosed}
                onChange={(e) => setSelectedPartId(e.target.value)}
              >
                <option value="">Selecione uma peça...</option>
                {parts.map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.name} · est. {part.currentStock} ·{" "}
                    {formatPrice(part.price ?? 0, "pt-BR")}
                  </option>
                ))}
              </select>
              <Input
                className="sm:w-24"
                value={partQty}
                disabled={isClosed}
                onChange={(e) => setPartQty(e.target.value)}
                placeholder="Qtd"
              />
              <Button
                className={primaryGradientButton}
                disabled={isClosed || !selectedPartId}
                onClick={() => void addPart()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">Itens da OS</h2>
            {(order.items ?? []).length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum item adicionado.</p>
            ) : (
              <div className="space-y-2">
                {(order.items ?? []).map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {line.description}
                      </div>
                      <div className="text-xs text-gray-500">
                        {line.kind === "part" ? "Peça" : "Serviço"} ·{" "}
                        {line.quantity} x {formatPrice(line.unitPrice, "pt-BR")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {formatPrice(line.lineTotal, "pt-BR")}
                      </span>
                      {!isClosed && (
                        <button
                          type="button"
                          className="p-1.5 text-gray-400 hover:text-red-600"
                          onClick={() => void removeLine(line.id)}
                          aria-label="Remover item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 border-t border-gray-100 pt-4 space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Mão de obra</span>
                <span>{formatPrice(order.laborTotal, "pt-BR")}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Peças</span>
                <span>{formatPrice(order.partsTotal, "pt-BR")}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Desconto</span>
                <span>- {formatPrice(order.discount, "pt-BR")}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 pt-1">
                <span>Total</span>
                <span>{formatPrice(order.total, "pt-BR")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TeamLayout>
  );
}
