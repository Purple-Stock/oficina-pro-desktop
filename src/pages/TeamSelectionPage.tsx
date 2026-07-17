import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Home, ChevronLeft, ChevronRight, Plus, Users } from "lucide-react";
import * as api from "@/api/desktop-api";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { EditTeamModal } from "@/components/EditTeamModal";
import { TeamCard } from "@/components/TeamCard";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";
import type { TeamDto } from "@/services/types";

export function TeamSelectionPage() {
  const { language, setLanguage, t } = useTranslation();
  const [teams, setTeams] = useState<TeamDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamDto | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingTeamId, setDeletingTeamId] = useState<number | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<TeamDto | null>(null);

  useEffect(() => {
    void (async () => {
      await api.initDatabase();
      const result = await api.listTeams();
      if (result.ok) setTeams(result.data.teams);
      setIsLoading(false);
    })();
  }, []);

  const refreshTeams = async () => {
    const refreshed = await api.listTeams();
    if (refreshed.ok) setTeams(refreshed.data.teams);
  };

  const handleEdit = (id: number) => {
    const team = teams.find((entry) => entry.id === id);
    if (team) {
      setEditingTeam(team);
      setIsEditModalOpen(true);
    }
  };

  const handleDeleteClick = (id: number) => {
    const team = teams.find((entry) => entry.id === id);
    if (team?.canDeleteTeam) {
      setTeamToDelete(team);
      setDeleteModalOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!teamToDelete) return;
    setDeletingTeamId(teamToDelete.id);
    const result = await api.deleteTeam(teamToDelete.id);
    setDeletingTeamId(null);
    if (!result.ok) return;
    await refreshTeams();
    setDeleteModalOpen(false);
    setTeamToDelete(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <header className="bg-white border-b border-gray-200 shadow-sm px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#1D4ED8] to-[#2563EB] rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <svg
              className="w-6 h-6 sm:w-7 sm:h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="font-bold text-base sm:text-lg md:text-xl text-gray-900 tracking-tight truncate">
            OFICINA PRO
          </span>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-100 rounded-lg p-0.5 sm:p-1">
          {(["en", "pt-BR", "fr"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-md transition-all ${
                language === lang
                  ? "bg-white text-[#1D4ED8] font-semibold shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {lang === "pt-BR" ? "PT" : lang.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        <aside
          className={`hidden lg:block bg-white min-h-[calc(100vh-73px)] border-r border-gray-200 relative transition-all duration-300 ${
            isSidebarCollapsed ? "w-20" : "w-64"
          }`}
        >
          <div
            className={`p-6 transition-all duration-300 ${isSidebarCollapsed ? "px-4" : ""}`}
          >
            <div
              className={`flex items-center gap-3 mb-8 ${isSidebarCollapsed ? "justify-center" : ""}`}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-[#1D4ED8] to-[#2563EB] rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                <Home className="h-5 w-5 text-white" />
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <h2 className="font-bold text-gray-900 text-lg">
                    {t.common.selectTeam}
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">
                    {t.common.chooseTeam}
                  </p>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center shadow-md hover:shadow-lg hover:border-[#1D4ED8] transition-all z-10"
            aria-label={
              isSidebarCollapsed
                ? t.common.expandSidebar
                : t.common.collapseSidebar
            }
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            )}
          </button>
        </aside>

        <main className="flex-1 p-4 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">
                {t.teamSelection.title}
              </h1>
              <p className="text-gray-600 text-sm sm:text-base md:text-lg">
                {t.teamSelection.subtitle}
              </p>
            </div>
            <Link to="/teams/new" className="w-full sm:w-auto">
              <Button className="bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] hover:from-[#1E40AF] hover:to-[#1D4ED8] text-white border-0 shadow-lg hover:shadow-xl transition-all w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">
                  {t.teamSelection.createTeam}
                </span>
                <span className="sm:hidden">
                  {t.teamSelection.createTeamShort}
                </span>
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="text-center py-12 sm:py-20">
              <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-[#1D4ED8] border-t-transparent mb-4" />
              <p className="text-gray-600 text-base sm:text-lg font-medium">
                {t.teamSelection.loadingTeams}
              </p>
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-12 sm:py-20 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 px-4 sm:px-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Users className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
              </div>
              <p className="text-gray-700 text-lg sm:text-xl font-semibold mb-2">
                {t.teamSelection.noTeams}
              </p>
              <p className="text-gray-500 text-sm sm:text-base mb-4 sm:mb-6">
                {t.teamSelection.noTeamsMessage}
              </p>
              <Link to="/teams/new">
                <Button className="bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] hover:from-[#1E40AF] hover:to-[#1D4ED8] text-white shadow-lg hover:shadow-xl transition-all">
                  <Plus className="h-4 w-4 mr-2" />
                  {t.teamSelection.createFirstTeam}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {teams.map((team) => (
                <TeamCard
                  key={team.id}
                  id={team.id}
                  name={team.name}
                  createdAt={team.createdAt}
                  notes={team.notes}
                  itemCount={team.itemCount ?? 0}
                  transactionCount={team.transactionCount ?? 0}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  canDelete={team.canDeleteTeam}
                  isDeleting={deletingTeamId === team.id}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <EditTeamModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTeam(null);
        }}
        team={editingTeam}
        onSuccess={refreshTeams}
      />

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setTeamToDelete(null);
        }}
        onConfirm={() => void handleDeleteConfirm()}
        title={t.teamSelection.deleteTeam}
        itemName={teamToDelete?.name}
        isDeleting={deletingTeamId !== null}
      />
    </div>
  );
}
