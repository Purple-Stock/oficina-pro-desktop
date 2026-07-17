import { useState } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Move,
  FileText,
  BarChart3,
  Tag,
  FileBarChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ScanLine,
  ClipboardList,
  Users,
  Car,
  Wrench,
  Package,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface TeamLayoutProps {
  team: { id: number; name: string };
  activeMenuItem?: string;
  children: React.ReactNode;
}

export function TeamLayout({
  team,
  activeMenuItem,
  children,
}: TeamLayoutProps) {
  const { language, setLanguage, t } = useTranslation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const teamId = team.id.toString();

  const menuItems = [
    {
      icon: ClipboardList,
      label: t.menu.serviceOrders,
      href: `/teams/${teamId}/service-orders`,
      key: "service-orders",
    },
    {
      icon: Users,
      label: t.menu.clients,
      href: `/teams/${teamId}/clients`,
      key: "clients",
    },
    {
      icon: Car,
      label: t.menu.vehicles,
      href: `/teams/${teamId}/vehicles`,
      key: "vehicles",
    },
    {
      icon: Package,
      label: t.menu.itemList,
      href: `/teams/${teamId}/items`,
      key: "items",
    },
    {
      icon: Wrench,
      label: t.menu.workshopServices,
      href: `/teams/${teamId}/workshop-services`,
      key: "workshop-services",
    },
    {
      icon: MapPin,
      label: t.menu.locations,
      href: `/teams/${teamId}/locations`,
      key: "locations",
    },
    {
      icon: ArrowUp,
      label: t.menu.stockIn,
      href: `/teams/${teamId}/stock-in`,
      key: "stock-in",
    },
    {
      icon: ArrowDown,
      label: t.menu.stockOut,
      href: `/teams/${teamId}/stock-out`,
      key: "stock-out",
    },
    {
      icon: RotateCcw,
      label: t.menu.adjust,
      href: `/teams/${teamId}/adjust`,
      key: "adjust",
    },
    {
      icon: Move,
      label: t.menu.move,
      href: `/teams/${teamId}/move`,
      key: "move",
    },
    {
      icon: FileText,
      label: t.menu.transactions,
      href: `/teams/${teamId}/transactions`,
      key: "transactions",
    },
    {
      icon: ScanLine,
      label: t.menu.scan,
      href: `/teams/${teamId}/scan`,
      key: "scan",
    },
    {
      icon: BarChart3,
      label: t.menu.stockByLocation,
      href: `/teams/${teamId}/stock-by-location`,
      key: "stock-by-location",
    },
    {
      icon: Tag,
      label: t.menu.labels,
      href: `/teams/${teamId}/labels`,
      key: "labels",
    },
    {
      icon: FileBarChart,
      label: t.menu.reports,
      href: `/teams/${teamId}/reports`,
      key: "reports",
    },
    {
      icon: Settings,
      label: t.menu.settings,
      href: `/teams/${teamId}/settings`,
      key: "settings",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <header className="bg-white border-b border-gray-200 shadow-sm px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-700 hover:text-[#1D4ED8] hover:bg-blue-50 rounded-lg transition-all touch-manipulation"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
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

        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
          <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-100 rounded-lg p-0.5 sm:p-1">
            {(["en", "pt-BR", "fr"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-md transition-all touch-manipulation min-h-[36px] sm:min-h-0 ${
                  language === lang
                    ? "bg-white text-[#1D4ED8] font-semibold shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {lang === "pt-BR" ? "PT" : lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-2xl z-50 lg:hidden transform transition-transform duration-300 ease-in-out ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200">
            <h3 className="font-bold text-gray-900 text-lg">{team.name}</h3>
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all touch-manipulation"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-6">
            <Link
              to="/"
              onClick={() => setIsMobileSidebarOpen(false)}
              className="text-sm text-[#1D4ED8] hover:text-[#2563EB] hover:underline font-medium transition-colors w-full text-left block"
            >
              {t.common.changeTeam}
            </Link>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeMenuItem === item.key;
              return (
                <Link
                  key={item.key}
                  to={item.href}
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white shadow-md"
                      : "text-gray-700 hover:bg-blue-50 hover:text-[#1D4ED8]"
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="flex flex-col lg:flex-row">
        <aside
          className={`hidden lg:block bg-white min-h-[calc(100vh-73px)] border-r border-gray-200 shadow-sm relative transition-all duration-300 ${
            isSidebarCollapsed ? "w-20" : "w-64"
          }`}
        >
          <div
            className={`p-6 transition-all duration-300 ${isSidebarCollapsed ? "px-4" : ""}`}
          >
            <div
              className={`mb-6 pb-6 border-b border-gray-200 ${isSidebarCollapsed ? "mb-4 pb-4" : ""}`}
            >
              <div
                className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"} mb-2`}
              >
                {!isSidebarCollapsed ? (
                  <>
                    <h3 className="font-bold text-gray-900 text-lg truncate">
                      {team.name}
                    </h3>
                    <Link
                      to="/"
                      className="text-xs text-[#1D4ED8] hover:text-[#2563EB] hover:underline font-medium transition-colors flex-shrink-0"
                    >
                      {t.common.changeTeam}
                    </Link>
                  </>
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-[#1D4ED8] to-[#2563EB] rounded-xl flex items-center justify-center shadow-md">
                    <span className="text-white font-bold text-sm">
                      {team.name?.charAt(0).toUpperCase() || "T"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeMenuItem === item.key;
                return (
                  <Link
                    key={item.key}
                    to={item.href}
                    className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white shadow-md"
                        : "text-gray-700 hover:bg-blue-50 hover:text-[#1D4ED8]"
                    }`}
                    title={isSidebarCollapsed ? item.label : undefined}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!isSidebarCollapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center shadow-md hover:shadow-lg hover:border-[#1D4ED8] transition-all z-10 touch-manipulation"
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

        <main className="flex-1 p-4 sm:p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
