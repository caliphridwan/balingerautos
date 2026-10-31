import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatPrice(
  amount: number,
  currency = "NGN",
  locale = "en-NG",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number, locale = "en-NG"): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatMileage(value: number, unit = "km", locale = "en-NG"): string {
  return `${formatNumber(value, locale)} ${unit}`;
}

/** Turns an ENUM_VALUE into "Enum value". */
export function humanizeEnum(value: string): string {
  const lower = value.toLowerCase().replace(/_/g, " ");
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function absoluteUrl(path = "/"): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** "$", "₦", "£"… for labels like "Deposit ($)". */
export function currencySymbol(currency: string, locale = "en-NG"): string {
  try {
    return (
      new Intl.NumberFormat(locale, { style: "currency", currency }).formatToParts(0).find((p) => p.type === "currency")?.value ??
      currency
    );
  } catch {
    return currency;
  }
}
