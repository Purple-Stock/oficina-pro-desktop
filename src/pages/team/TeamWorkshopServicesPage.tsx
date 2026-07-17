import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, Wrench } from "lucide-react";
import * as api from "@/api/desktop-api";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/formatPrice";
import { primaryGradientButton, primaryGradientIconCircle } from "@/lib/styles";
import type { TeamDto, WorkshopServiceDto } from "@/services/types";

export function TeamWorkshopServicesPage() {
  const { teamId = "" } = useParams();
  const id = Number(teamId);
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [services, setServices] = useState<WorkshopServiceDto[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [minutes, setMinutes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const teamResult = await api.getTeam(id);
    if (teamResult.ok) setTeam(teamResult.data.team);
    const servicesResult = await api.listTeamWorkshopServices(id);
    if (servicesResult.ok) setServices(servicesResult.data.services);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return services;
    return services.filter((service) =>
      service.name.toLowerCase().includes(query)
    );
  }, [services, searchQuery]);

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    const result = await api.createTeamWorkshopService(id, {
      name,
      description: description || null,
      price: price ? Number(price.replace(",", ".")) : 0,
      estimatedMinutes: minutes ? Number(minutes) : 0,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setName("");
    setDescription("");
    setPrice("");
    setMinutes("");
    await load();
  };

  const handleDelete = async (serviceId: number) => {
    if (!window.confirm("Excluir este serviço?")) return;
    await api.deleteTeamWorkshopService(id, serviceId);
    await load();
  };

  if (!team) return <div className="p-8">Carregando...</div>;

  return (
    <TeamLayout team={team} activeMenuItem="workshop-services">
      <PageHeader
        title="Serviços"
        subtitle="Catálogo de mão de obra da oficina"
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-900">Novo serviço</h2>
          <div className="space-y-1.5">
            <Label htmlFor="service-name">Nome *</Label>
            <Input
              id="service-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Troca de óleo"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="service-description">Descrição</Label>
            <Input
              id="service-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="service-price">Preço</Label>
              <Input
                id="service-price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="120,00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="service-minutes">Minutos</Label>
              <Input
                id="service-minutes"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="60"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            className={`${primaryGradientButton} w-full`}
            onClick={() => void handleCreate()}
            disabled={saving || !name.trim()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Salvar serviço
          </Button>
        </div>

        <div>
          <div className="mb-4">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar serviço..."
            />
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Wrench}
              iconClassName={primaryGradientIconCircle}
              title="Nenhum serviço"
              message="Cadastre serviços de mão de obra para usar nas OS."
            />
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Serviço
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Preço
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">
                      Tempo
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((service) => (
                    <tr
                      key={service.id}
                      className="border-b border-gray-100 hover:bg-blue-50/40"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {service.name}
                        {service.description && (
                          <div className="text-xs text-gray-500">
                            {service.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-800">
                        {formatPrice(service.price, "pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                        {service.estimatedMinutes
                          ? `${service.estimatedMinutes} min`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => void handleDelete(service.id)}
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
