import { cache } from "react";
import type { SiteSettings } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface OpeningHoursRow {
  days: string;
  hours: string;
}

export type PublicSettings = SiteSettings & { openingHoursRows: OpeningHoursRow[] };

function parseOpeningHours(value: unknown): OpeningHoursRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row): OpeningHoursRow[] => {
    if (
      row !== null &&
      typeof row === "object" &&
      "days" in row &&
      "hours" in row &&
      typeof row.days === "string" &&
      typeof row.hours === "string"
    ) {
      return [{ days: row.days, hours: row.hours }];
    }
    return [];
  });
}

/**
 * Site-wide settings, cached per request. Creates the default row on first
 * use so a fresh database still renders (the schema holds the defaults).
 */
export const getSiteSettings = cache(async (): Promise<PublicSettings> => {
  const settings =
    (await prisma.siteSettings.findUnique({ where: { id: "default" } })) ??
    (await prisma.siteSettings.create({ data: { id: "default" } }));
  return { ...settings, openingHoursRows: parseOpeningHours(settings.openingHours) };
});
