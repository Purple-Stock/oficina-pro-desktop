import type { Language } from "@/lib/i18n";

export function formatPrice(
  price: number | null | undefined,
  language: Language
): string {
  if (price == null) return "—";

  const locale =
    language === "pt-BR" ? "pt-BR" : language === "fr" ? "fr-FR" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: language === "pt-BR" ? "BRL" : "USD",
  }).format(price);
}
