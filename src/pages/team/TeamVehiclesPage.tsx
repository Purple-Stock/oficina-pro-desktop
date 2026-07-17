import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Car, Plus } from "lucide-react";
import * as api from "@/api/desktop-api";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  primaryGradientButton,
  primaryGradientIconCircle,
} from "@/lib/styles";
import { formSelectClass } from "@/lib/styles";
import type { ClientDto, TeamDto, VehicleDto } from "@/services/types";

export function TeamVehiclesPage() {
  const { teamId = "" } = useParams();
  const id = Number(teamId);
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [clientId, setClientId] = useState("");
  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");
  const [odometer, setOdometer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const teamResult = await api.getTeam(id);
    if (teamResult.ok) setTeam(teamResult.data.team);
    const vehiclesResult = await api.listTeamVehicles(id);
    if (vehiclesResult.ok) setVehicles(vehiclesResult.data.vehicles);
    const clientsResult = await api.listTeamClients(id);
    if (clientsResult.ok) setClients(clientsResult.data.clients);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return vehicles;
    return vehicles.filter(
      (vehicle) =>
        vehicle.plate.toLowerCase().includes(query) ||
        vehicle.brand?.toLowerCase().includes(query) ||
        vehicle.model?.toLowerCase().includes(query) ||
        vehicle.clientName?.toLowerCase().includes(query)
    );
  }, [vehicles, searchQuery]);

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    const result = await api.createTeamVehicle(id, {
      clientId: Number(clientId),
      plate,
      brand: brand || null,
      model: model || null,
      year: year ? Number(year) : null,
      color: color || null,
      odometer: odometer ? Number(odometer) : null,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setPlate("");
    setBrand("");
    setModel("");
    setYear("");
    setColor("");
    setOdometer("");
    await load();
  };

  const handleDelete = async (vehicleId: number) => {
    if (!window.confirm("Excluir este veículo?")) return;
    await api.deleteTeamVehicle(id, vehicleId);
    await load();
  };

  if (!team) return <div className="p-8">Carregando...</div>;

  return (
    <TeamLayout team={team} activeMenuItem="vehicles">
      <PageHeader
        title="Veículos"
        subtitle="Placas e dados dos veículos dos clientes"
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-900">Novo veículo</h2>
          <div className="space-y-1.5">
            <Label htmlFor="vehicle-client">Cliente *</Label>
            <select
              id="vehicle-client"
              className={formSelectClass}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vehicle-plate">Placa *</Label>
            <Input
              id="vehicle-plate"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder="ABC1D23"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="vehicle-brand">Marca</Label>
              <Input
                id="vehicle-brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vehicle-model">Modelo</Label>
              <Input
                id="vehicle-model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="vehicle-year">Ano</Label>
              <Input
                id="vehicle-year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vehicle-color">Cor</Label>
              <Input
                id="vehicle-color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vehicle-odometer">Km</Label>
            <Input
              id="vehicle-odometer"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            className={`${primaryGradientButton} w-full`}
            onClick={() => void handleCreate()}
            disabled={saving || !plate.trim() || !clientId}
          >
            <Plus className="h-4 w-4 mr-2" />
            Salvar veículo
          </Button>
        </div>

        <div>
          <div className="mb-4">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar por placa, marca, modelo ou cliente..."
            />
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Car}
              iconClassName={primaryGradientIconCircle}
              title="Nenhum veículo"
              message="Cadastre um cliente e depois o veículo."
            />
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Placa
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Veículo
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">
                      Cliente
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((vehicle) => (
                    <tr
                      key={vehicle.id}
                      className="border-b border-gray-100 hover:bg-blue-50/40"
                    >
                      <td className="px-4 py-3 font-semibold text-[#1D4ED8]">
                        {vehicle.plate}
                      </td>
                      <td className="px-4 py-3 text-gray-800">
                        {[vehicle.brand, vehicle.model, vehicle.year]
                          .filter(Boolean)
                          .join(" ") || "—"}
                        {vehicle.color && (
                          <div className="text-xs text-gray-500">
                            {vehicle.color}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                        {vehicle.clientName || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => void handleDelete(vehicle.id)}
                        >
                          Excluir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </TeamLayout>
  );
}
