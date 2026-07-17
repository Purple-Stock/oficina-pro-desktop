import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import * as api from "@/api/desktop-api";
import { FormPageShell } from "@/components/shared/FormPageShell";
import { TeamForm } from "@/components/teams/TeamForm";
import { useTranslation } from "@/lib/i18n";

export function NewTeamPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError(t.team.teamNameRequired);
      return;
    }

    setIsLoading(true);
    const result = await api.createTeam({
      name: name.trim(),
      notes: notes.trim() || null,
    });
    setIsLoading(false);

    if (!result.ok) {
      setError(result.error.message || t.team.unexpectedError);
      return;
    }

    setSuccess(t.team.createSuccess);
    navigate(`/teams/${result.data.team.id}/items`);
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
        <Link
          to="/"
          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-gray-700 hover:text-[#1D4ED8] hover:bg-blue-50 rounded-lg transition-all font-medium text-xs sm:text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t.common.back}</span>
        </Link>
      </header>

      <main className="flex justify-center p-4 sm:p-8">
        <FormPageShell
          title={t.team.createTitle}
          subtitle={t.team.createSubtitle}
          backHref="/"
          backLabel={t.common.back}
          success={success}
          error={error}
        >
          <TeamForm
            t={t}
            name={name}
            notes={notes}
            isLoading={isLoading}
            mode="create"
            cancelHref="/"
            onSubmit={handleSubmit}
            onNameChange={setName}
            onNotesChange={setNotes}
          />
        </FormPageShell>
      </main>
    </div>
  );
}
