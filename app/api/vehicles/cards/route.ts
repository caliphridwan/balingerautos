import { NextResponse } from "next/server";
import { VehicleStatus } from "@prisma/client";
import { vehicleTitle } from "@/lib/vehicles/format";
import { prisma } from "@/lib/prisma";
import { rateLimitKey } from "@/lib/rate-limit-core";
import { getSiteSettings } from "@/lib/settings";
import { formatMileage, formatPrice } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/vehicles/labels";

/**
 * Public card data for client-side lists (favourites, recently viewed),
 * which only know vehicle slugs from localStorage.
 *   GET /api/vehicles/cards?slugs=a,b,c
 */
export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimitKey(`cards:${ip}`, 120, 60_000).ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const slugs = (new URL(request.url).searchParams.get("slugs") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9-]{1,160}$/.test(s))
    .slice(0, 30);
  if (slugs.length === 0) return NextResponse.json({ vehicles: [] });

  const [settings, rows] = await Promise.all([
    getSiteSettings(),
    prisma.vehicle.findMany({
      where: { slug: { in: slugs }, isPublished: true, status: { not: VehicleStatus.ARCHIVED } },
      select: {
        slug: true,
        year: true,
        make: true,
        model: true,
        trim: true,
        price: true,
        currency: true,
        priceOnRequest: true,
        mileage: true,
        status: true,
        images: { orderBy: { position: "asc" }, take: 1, select: { url: true, alt: true } },
      },
    }),
  ]);
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  const vehicles = slugs.flatMap((slug) => {
    const v = bySlug.get(slug);
    if (!v) return [];
    return [
      {
        slug: v.slug,
        title: vehicleTitle(v),
        price: v.priceOnRequest ? "Price on request" : formatPrice(Number(v.price), v.currency, settings.locale),
        mileage: formatMileage(v.mileage, settings.mileageUnit, settings.locale),
        status: STATUS_LABELS[v.status],
        image: v.images[0] ?? null,
      },
    ];
  });
  return NextResponse.json({ vehicles }, { headers: { "Cache-Control": "public, max-age=60" } });
}
