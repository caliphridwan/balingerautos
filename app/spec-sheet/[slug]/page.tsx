import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { FeatureGroup, VehicleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { absoluteUrl, formatMileage, formatPrice } from "@/lib/utils";
import { vehicleTitle } from "@/lib/vehicles/format";
import { BODY_TYPE_LABELS, CONDITION_LABELS, FUEL_LABELS, TRANSMISSION_LABELS } from "@/lib/vehicles/labels";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Specification sheet", robots: { index: false } };

const GROUP_LABELS: Record<FeatureGroup, string> = { KEY: "Key features", SAFETY: "Safety", COMFORT: "Comfort", TECHNOLOGY: "Technology" };

/** Print-ready A4 specification sheet. "Print / Save as PDF" downloads it. */
export default async function SpecSheetPage({ params }: { params: { slug: string } }) {
  const [vehicle, settings] = await Promise.all([
    prisma.vehicle.findFirst({
      where: { slug: params.slug, isPublished: true, status: { not: VehicleStatus.ARCHIVED } },
      include: { images: { orderBy: { position: "asc" }, take: 1 }, features: { orderBy: [{ group: "asc" }, { position: "asc" }] } },
    }),
    getSiteSettings(),
  ]);
  if (!vehicle) notFound();

  const title = vehicleTitle(vehicle);
  const rows: Array<[string, string | null]> = [
    ["Stock number", vehicle.stockNumber],
    ["Condition", CONDITION_LABELS[vehicle.condition]],
    ["Body type", BODY_TYPE_LABELS[vehicle.bodyType]],
    ["Mileage", formatMileage(vehicle.mileage, settings.mileageUnit, settings.locale)],
    ["Transmission", TRANSMISSION_LABELS[vehicle.transmission]],
    ["Fuel", FUEL_LABELS[vehicle.fuelType]],
    ["Engine", vehicle.engineCapacityCc ? `${vehicle.engineCapacityCc} cc` : null],
    ["Power", vehicle.horsepower ? `${vehicle.horsepower} hp` : null],
    ["Drivetrain", vehicle.drivetrain],
    ["Exterior", vehicle.exteriorColour],
    ["Interior", vehicle.interiorColour],
    ["Doors / seats", vehicle.doors || vehicle.seats ? `${vehicle.doors ?? "—"} / ${vehicle.seats ?? "—"}` : null],
    ["VIN", vehicle.showVin ? vehicle.vin : null],
  ];
  const groups = (Object.keys(GROUP_LABELS) as FeatureGroup[])
    .map((g) => ({ g, items: vehicle.features.filter((f) => f.group === g) }))
    .filter((x) => x.items.length > 0);
  const contact = [settings.phone, settings.email, [settings.addressLine, settings.city].filter(Boolean).join(", ")].filter(Boolean).join("  ·  ");

  return (
    <main className="min-h-screen bg-[#E9E7E1] py-8 print:bg-white print:py-0">
      <style>{`@page { size: A4; margin: 14mm; } @media print { .no-print { display: none !important; } }`}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] justify-end gap-3 px-4">
        <PrintButton />
      </div>
      <article className="mx-auto flex max-w-[210mm] flex-col gap-6 bg-white p-[14mm] text-obsidian shadow-lg print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between border-b border-obsidian pb-4">
          <div className="flex flex-col">
            <span className="font-display text-xl tracking-[0.18em]">BALINGER</span>
            <span className="text-[8px] font-bold tracking-[0.6em] text-deepgold">AUTOS</span>
          </div>
          <span className="text-right text-[10pt] text-ink-muted">Specification sheet</span>
        </header>
        <div className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-[22pt] leading-tight">{title}</h1>
            <span className="text-[10pt] text-ink-muted">{absoluteUrl(`/inventory/${vehicle.slug}`)}</span>
          </div>
          <div className="text-right">
            <span className="block text-[9pt] uppercase tracking-[0.14em] text-ink-muted">Price</span>
            <span className="text-[20pt] font-bold">
              {vehicle.priceOnRequest ? "On request" : formatPrice(Number(vehicle.price), vehicle.currency, settings.locale)}
            </span>
          </div>
        </div>
        {vehicle.images[0] ? (
          <div className="relative aspect-[16/8] w-full overflow-hidden bg-ivory-soft">
            <Image src={vehicle.images[0].url} alt={vehicle.images[0].alt ?? title} fill sizes="800px" className="object-cover" priority />
          </div>
        ) : null}
        <dl className="grid grid-cols-2 gap-x-8 text-[10.5pt]">
          {rows
            .filter((r): r is [string, string] => Boolean(r[1]))
            .map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-ivory-line py-1.5">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
        </dl>
        {groups.length > 0 ? (
          <div className="grid grid-cols-2 gap-6 text-[10pt]">
            {groups.map(({ g, items }) => (
              <div key={g}>
                <h2 className="mb-1.5 text-[9pt] font-bold uppercase tracking-[0.16em]">{GROUP_LABELS[g]}</h2>
                <ul className="list-disc pl-4 leading-relaxed">
                  {items.map((f) => (
                    <li key={f.id}>{f.label}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}
        {vehicle.description ? <p className="whitespace-pre-line text-[10pt] leading-relaxed text-ink-body">{vehicle.description}</p> : null}
        <footer className="mt-auto border-t border-ivory-line pt-3 text-[8.5pt] text-ink-muted">
          {settings.businessName}
          {contact ? `  ·  ${contact}` : ""}
          <br />
          Details are provided in good faith; please confirm specification and availability with our team before purchase.
        </footer>
      </article>
    </main>
  );
}
