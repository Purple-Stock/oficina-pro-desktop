import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronDown, Package, Plus } from "lucide-react";
import * as api from "@/api/desktop-api";
import { ItemsList } from "@/components/items/ItemsList";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { Button } from "@/components/ui/button";
import { normalizeItemDto } from "@/lib/normalizeItem";
import { purpleGradientButton, purpleGradientIconCircle } from "@/lib/styles";
import { useTranslation } from "@/lib/i18n";
import type { ItemDto, TeamDto } from "@/services/types";

export function TeamItemsPage() {
  const { teamId = "" } = useParams();
  const navigate = useNavigate();
  const { language, t } = useTranslation();
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [items, setItems] = useState<ItemDto[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const load = async () => {
    const id = Number(teamId);
    const teamResult = await api.getTeam(id);
    if (teamResult.ok) setTeam(teamResult.data.team);
    const itemsResult = await api.listTeamItems(id);
    if (itemsResult.ok) {
      setItems(
        itemsResult.data.items.map((entry) =>
          normalizeItemDto(entry as unknown as Record<string, unknown>)
        )
      );
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.name?.toLowerCase().includes(query) ||
        item.sku?.toLowerCase().includes(query) ||
        item.barcode?.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const isSearchActive = searchQuery.trim().length > 0;
  const isEmpty = filteredItems.length === 0;

  const handleDelete = async (itemId: number) => {
    const result = await api.deleteTeamItem(Number(teamId), itemId);
    if (result.ok) await load();
  };

  if (!team) return <div className="p-8">{t.common.loading}</div>;

  return (
    <TeamLayout team={team} activeMenuItem="items">
      <PageHeader
        title={t.items.title}
        subtitle={t.items.subtitle}
        actions={
          <Link to={`/teams/${teamId}/items/new`}>
            <Button
              className={`${purpleGradientButton} h-10 sm:h-11 text-xs sm:text-sm`}
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t.items.addItem}</span>
              <span className="sm:hidden">{t.items.addItemShort}</span>
            </Button>
          </Link>
        }
      />

      <div className="mb-4 sm:mb-6 space-y-3">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t.items.searchPlaceholder}
        />
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50 h-10 sm:h-11 text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">{t.items.allCategories}</span>
            <span className="sm:hidden">{t.items.categories}</span>
            <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
          </Button>
        </div>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={Package}
          iconClassName={purpleGradientIconCircle}
          title={isSearchActive ? t.items.noItemsSearch : t.items.noItems}
          message={
            isSearchActive
              ? t.items.noItemsSearchMessage
              : t.items.noItemsMessage
          }
          action={
            !isSearchActive ? (
              <Link to={`/teams/${teamId}/items/new`}>
                <Button className={`${purpleGradientButton} min-h-[48px]`}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t.items.addFirstItem}
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ItemsList
          items={filteredItems}
          language={language}
          labels={{
            item: t.items.item,
            sku: t.items.sku,
            type: t.items.type,
            typeFallback: t.items.typeFallback,
            stock: t.items.stock,
            price: t.items.price,
            unnamedItem: t.items.unnamedItem,
            deleteConfirm: t.items.deleteConfirm,
            actions: t.common.actions,
            edit: t.common.edit,
            delete: t.common.delete,
            cancel: t.common.cancel,
            noCode: t.items.noCode,
          }}
          onEdit={(item) => navigate(`/teams/${teamId}/items/${item.id}/edit`)}
          onDelete={handleDelete}
        />
      )}
    </TeamLayout>
  );
}
