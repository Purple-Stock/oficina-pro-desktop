import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import * as api from "@/api/desktop-api";
import { FormPageShell } from "@/components/shared/FormPageShell";
import { StockOperationForm } from "@/components/stock/StockOperationForm";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { useTranslation } from "@/lib/i18n";
import type { StockTransactionType } from "@/db/types";
import type { ItemDto, LocationDto, TeamDto } from "@/services/types";

interface TeamStockOperationPageProps {
  activeMenuItem: string;
  titleKey: keyof ReturnType<typeof useTranslation>["t"]["stock"];
  transactionType: StockTransactionType;
}

function getSubmitLabelKey(
  titleKey: TeamStockOperationPageProps["titleKey"]
): keyof ReturnType<typeof useTranslation>["t"]["stock"] {
  const map: Partial<
    Record<
      TeamStockOperationPageProps["titleKey"],
      keyof ReturnType<typeof useTranslation>["t"]["stock"]
    >
  > = {
    stockInTitle: "stockInSubmit",
    stockOutTitle: "stockOutSubmit",
    adjustTitle: "adjustSubmit",
    moveTitle: "moveSubmit",
  };
  return map[titleKey] ?? "submit";
}

function getSubtitleKey(
  titleKey: TeamStockOperationPageProps["titleKey"]
): keyof ReturnType<typeof useTranslation>["t"]["stock"] | null {
  const map: Partial<
    Record<
      TeamStockOperationPageProps["titleKey"],
      keyof ReturnType<typeof useTranslation>["t"]["stock"]
    >
  > = {
    stockInTitle: "stockInSubtitle",
    stockOutTitle: "stockOutSubtitle",
    adjustTitle: "adjustSubtitle",
    moveTitle: "moveSubtitle",
  };
  return map[titleKey] ?? null;
}

export function TeamStockOperationPage({
  activeMenuItem,
  titleKey,
  transactionType,
}: TeamStockOperationPageProps) {
  const { teamId = "" } = useParams();
  const { t } = useTranslation();
  const [team, setTeam] = useState<TeamDto | null>(null);
  const [items, setItems] = useState<ItemDto[]>([]);
  const [locations, setLocations] = useState<LocationDto[]>([]);
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [destinationLocationId, setDestinationLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const id = Number(teamId);
    void (async () => {
      const teamResult = await api.getTeam(id);
      if (teamResult.ok) setTeam(teamResult.data.team);
      const itemsResult = await api.listTeamItems(id);
      if (itemsResult.ok) setItems(itemsResult.data.items);
      const locationsResult = await api.listTeamLocations(id);
      if (locationsResult.ok) setLocations(locationsResult.data.locations);
    })();
  }, [teamId]);

  const selectedItem = items.find((item) => item.id === Number(itemId));
  const subtitleKey = getSubtitleKey(titleKey);
  const submitLabelKey = getSubmitLabelKey(titleKey);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const payload: Record<string, unknown> = {
      itemId: Number(itemId),
      transactionType,
      quantity: Number(quantity),
      notes: notes || null,
    };

    if (destinationLocationId) {
      payload.destinationLocationId = Number(destinationLocationId);
    }

    if (transactionType === "move" && selectedItem?.locationId) {
      payload.sourceLocationId = selectedItem.locationId;
    }

    setIsLoading(true);
    const result = await api.createTeamStockTransaction(
      Number(teamId),
      payload
    );
    setIsLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setSuccess(t.stock.successMessage);
    setItemId("");
    setQuantity("1");
    setDestinationLocationId("");
    setNotes("");
  };

  if (!team) return <div className="p-8">{t.common.loading}</div>;

  return (
    <TeamLayout team={team} activeMenuItem={activeMenuItem}>
      <FormPageShell
        title={t.stock[titleKey]}
        subtitle={subtitleKey ? t.stock[subtitleKey] : undefined}
        success={success}
        error={error}
      >
        <StockOperationForm
          t={t}
          transactionType={transactionType}
          items={items}
          locations={locations}
          itemId={itemId}
          quantity={quantity}
          destinationLocationId={destinationLocationId}
          notes={notes}
          isLoading={isLoading}
          submitLabel={t.stock[submitLabelKey]}
          loadingLabel={t.stock.recording}
          onItemIdChange={setItemId}
          onQuantityChange={setQuantity}
          onDestinationLocationIdChange={setDestinationLocationId}
          onNotesChange={setNotes}
          onSubmit={handleSubmit}
        />
      </FormPageShell>
    </TeamLayout>
  );
}
