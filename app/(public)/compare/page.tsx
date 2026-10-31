import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { VehicleStatus } from "@prisma/client";
import { PageHero } from "@/components/shared/page-hero";
import { VehicleImage } from "@/components/vehicles/vehicle-image";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { formatMileage, formatPrice } from "@/lib/utils";
import { vehicleTitle } from "@/lib/vehicles/format";
import { BODY_TYPE_LABELS, CONDITION_LABELS, FUEL_LABELS, STATUS_LABELS, TRANSMISSION_LABELS } from "@/lib/vehicles/labels";
import { CompareSync } from "./compare-sync";

export const metadata: Metadata = { title: "Compare Vehicles", robots: { index: false } };

/** /compare?v=slug-a,slug-b,slug-c — shareable side-by-side comparison. */
export default async function ComparePage({ searchParams }: { searchParams: { v?: string } }) {
  const slugs = (searchParams.v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9-]{1,160}$/.test(s))
    .slice(0, 3);
  const settings = await getSiteSettings();
  const rows = slugs.length
    ? await prisma.vehicle.findMany({
        where: { slug: { in: slugs }, isPublished: true, status: { not: VehicleStatus.ARCHIVED } },
        include: { images: { orderBy: { position: "asc" }, take: 1 }, features: { select: { label: true } } },
      })
    : [];
  const vehicles = slugs.flatMap((s) => rows.filter((r) => r.slug === s));
  const unit = settings.mileageUnit;

  const attributes: Array<[string, (v: (typeof vehicles)[number]) => string]> = [
    ["Price", (v) => (v.priceOnRequest ? "On request" : formatPrice(Number(v.price), v.currency, settings.locale))],
    ["Status", (v) => STATUS_LABELS[v.status]],
    ["Year", (v) => String(v.year)],
    ["Condition", (v) => CONDITION_LABELS[v.condition]],
    ["Mileage", (v) => formatMileage(v.mileage, unit, settings.locale)],
    ["Body type", (v) => BODY_TYPE_LABELS[v.bodyType]],
    ["Fuel", (v) => FUEL_LABELS[v.fuelType]],
    ["Transmission", (v) => TRANSMISSION_LABELS[v.transmission]],
    ["Engine", (v) => (v.engineCapacityCc ? `${(v.engineCapacityCc / 1000).toFixed(1)} L` : "—")],
    ["Power", (v) => (v.horsepower ? `${v.horsepower} hp` : "—")],
    ["Drivetrain", (v) => v.drivetrain ?? "—"],
    ["Seats", (v) => (v.seats ? String(v.seats) : "—")],
    ["Exterior", (v) => v.exteriorColour],
    ["Interior", (v) => v.interiorColour ?? "—"],
    ["Features listed", (v) => String(v.features.length)],
  ];

  return (
    <>
      <PageHero eyebrow="Compare" title="Side by side" breadcrumb={[{ label: "Home", href: "/" }, { label: "Inventory", href: "/inventory" }, { label: "Compare" }]} />
      <Suspense fallback={null}>
        <CompareSync vehicles={vehicles.map((v) => ({ slug: v.slug, title: vehicleTitle(v) }))} />
      </Suspense>
      <section className="bg-ivory">
        <div className="mx-auto max-w-content px-6 py-16">
          {vehicles.length < 2 ? (
            <div className="flex flex-col items-start gap-4">
              <p className="text-[17px] text-ink-body">
                Choose “Compare” on two or three vehicle pages and they'll appear here side by side.
              </p>
              <Link href="/inventory" className="inline-flex min-h-[48px] items-center bg-obsidian px-6 text-xs font-bold uppercase tracking-button text-white">
                Browse inventory
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse bg-white text-[15px]">
                <caption className="sr-only">Vehicle comparison</caption>
                <thead>
                  <tr>
                    <th scope="col" className="w-44 border-b border-ivory-line p-4 text-left align-bottom text-xs uppercase tracking-[0.14em] text-ink-muted">
                      Vehicle
                    </th>
                    {vehicles.map((v) => (
                      <th key={v.id} scope="col" className="border-b border-l border-ivory-line p-4 text-left align-top font-normal">
                        <div className="relative mb-3 aspect-[16/10] overflow-hidden bg-graphite">
                          <VehicleImage image={v.images[0]} fallbackAlt={vehicleTitle(v)} sizes="300px" />
                        </div>
                        <Link href={`/inventory/${v.slug}`} className="font-display text-xl hover:text-deepgold">
                          {vehicleTitle(v)}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {attributes.map(([label, get]) => (
                    <tr key={label}>
                      <th scope="row" className="border-b border-ivory-soft p-4 text-left text-sm font-semibold text-ink-muted">
                        {label}
                      </th>
                      {vehicles.map((v) => (
                        <td key={v.id} className="border-b border-l border-ivory-soft p-4 font-semibold">
                          {get(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
