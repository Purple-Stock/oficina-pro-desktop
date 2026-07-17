import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Plus, Users } from "lucide-react";
import * as api from "@/api/desktop-api";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  accentButton,
  primaryGradientButton,
  primaryGradientIconCircle,
} from "@/lib/styles";
import type { ClientDto, TeamDto } from "@/services/types";

export function TeamClientsPage() {
  const { teamId = "" } = useParams();
  const id = Number(teamId);
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [clients, setClients] = useState<ClientDto[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [document, setDocument] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const teamResult = await api.getTeam(id);
    if (teamResult.ok) setTeam(teamResult.data.team);
    const clientsResult = await api.listTeamClients(id);
    if (clientsResult.ok) setClients(clientsResult.data.clients);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        client.phone?.toLowerCase().includes(query) ||
        client.document?.toLowerCase().includes(query)
    );
  }, [clients, searchQuery]);

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    const result = await api.createTeamClient(id, {
      name,
      phone: phone || null,
      email: email || null,
      document: document || null,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setName("");
    setPhone("");
    setEmail("");
    setDocument("");
    await load();
  };

  const handleDelete = async (clientId: number) => {
    if (!window.confirm("Excluir este cliente?")) return;
    await api.deleteTeamClient(id, clientId);
    await load();
  };

  if (!team) return <div className="p-8">Carregando...</div>;

  return (
    <TeamLayout team={team} activeMenuItem="clients">
      <PageHeader
        title="Clientes"
        subtitle="Cadastre clientes da oficina"
        actions={
          <Button className={`${accentButton} h-10 sm:h-11 text-sm`} disabled>
            <Users className="h-4 w-4 mr-2" />
            {clients.length} clientes
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-900">Novo cliente</h2>
          <div className="space-y-1.5">
            <Label htmlFor="client-name">Nome *</Label>
            <Input
              id="client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-phone">Telefone</Label>
            <Input
              id="client-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-email">E-mail</Label>
            <Input
              id="client-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="client-document">CPF/CNPJ</Label>
            <Input
              id="client-document"
              value={document}
              onChange={(e) => setDocument(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            className={`${primaryGradientButton} w-full`}
            onClick={() => void handleCreate()}
            disabled={saving || !name.trim()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Salvar cliente
          </Button>
        </div>

        <div>
          <div className="mb-4">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar por nome, telefone ou documento..."
            />
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              iconClassName={primaryGradientIconCircle}
              title="Nenhum cliente"
              message="Cadastre o primeiro cliente da oficina."
            />
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">
                      Nome
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">
                      Telefone
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">
                      Veículos
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-700">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((client) => (
                    <tr
                      key={client.id}
                      className="border-b border-gray-100 hover:bg-blue-50/40"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {client.name}
                        {client.document && (
                          <div className="text-xs text-gray-500">
                            {client.document}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                        {client.phone || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                        {client.vehicleCount ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => void handleDelete(client.id)}
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
