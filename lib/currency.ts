import { formatPrice } from "@/lib/utils";

export interface AltCurrency {
  code: string;
  rate: number;
}

/** Reads SiteSettings.altCurrencies safely. */
export function parseAltCurrencies(value: unknown): AltCurrency[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row): AltCurrency[] => {
    if (row && typeof row === "object" && "code" in row && "rate" in row) {
      const code = String(row.code).toUpperCase();
      const rate = Number(row.rate);
      if (/^[A-Z]{3}$/.test(code) && Number.isFinite(rate) && rate > 0) return [{ code, rate }];
    }
    return [];
  });
}

/** Approximate conversions of a base-currency amount, e.g. ["≈ ₦91,295,000"]. */
export function convertedPrices(amount: number, base: string, alts: AltCurrency[], locale: string): string[] {
  return alts
    .filter((a) => a.code !== base)
    .map((a) => {
      try {
        return `≈ ${formatPrice(amount * a.rate, a.code, locale)}`;
      } catch {
        return null;
      }
    })
    .filter((v): v is string => v !== null);
}
