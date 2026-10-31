import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { VehicleCardData } from "@/lib/vehicles/queries";
import { CONDITION_LABELS, FUEL_LABELS, TRANSMISSION_LABELS } from "@/lib/vehicles/labels";
import { formatMileage, formatPrice } from "@/lib/utils";
import { vehicleTitle } from "@/lib/vehicles/format";
import { VehicleImage } from "./vehicle-image";
import { StatusBadge } from "./status-badge";

export interface CardFormat {
  locale: string;
  mileageUnit: string;
}

export { vehicleTitle };

function priceLabel(v: VehicleCardData, locale: string): string {
  return v.priceOnRequest ? "Price on request" : formatPrice(Number(v.price), v.currency, locale);
}

interface VehicleCardProps {
  vehicle: VehicleCardData;
  format: CardFormat;
  priority?: boolean;
  headingLevel?: "h2" | "h3";
}

export function VehicleCard({ vehicle: v, format, priority, headingLevel: Heading = "h3" }: VehicleCardProps) {
  const href = `/inventory/${v.slug}`;
  const title = vehicleTitle(v);
  return (
    <article className="group relative flex flex-col border border-ivory-line bg-white transition-shadow duration-300 hover:shadow-[0_24px_48px_-24px_rgba(16,17,20,0.35)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-graphite">
        <VehicleImage
          image={v.images[0]}
          fallbackAlt={title}
          priority={priority}
          sizes="(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw"
        />
        <StatusBadge status={v.status} condition={v.condition} className="absolute left-4 top-4" />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
            {v.year} · {v.make} · {CONDITION_LABELS[v.condition]}
          </span>
          <Heading className="font-display text-2xl font-medium leading-tight">
            {/* Stretched link: the whole card is clickable, one tab stop */}
            <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none">
              {v.model}
              {v.trim ? <span className="text-ink-muted"> {v.trim}</span> : null}
            </Link>
          </Heading>
        </div>
        <dl className="grid grid-cols-3 gap-2 border-y border-ivory-soft py-3.5 text-[13px] text-ink-body">
          <div>
            <dt className="sr-only">Mileage</dt>
            <dd>{formatMileage(v.mileage, format.mileageUnit, format.locale)}</dd>
          </div>
          <div>
            <dt className="sr-only">Transmission</dt>
            <dd>{TRANSMISSION_LABELS[v.transmission]}</dd>
          </div>
          <div>
            <dt className="sr-only">Fuel</dt>
            <dd>{FUEL_LABELS[v.fuelType]}</dd>
          </div>
        </dl>
        <div className="mt-auto flex items-center justify-between gap-3">
          <span className="text-[22px] font-bold tracking-tight">{priceLabel(v, format.locale)}</span>
          <span
            aria-hidden="true"
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-obsidian transition-colors group-hover:text-deepgold"
          >
            Details <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.6} />
          </span>
        </div>
      </div>
    </article>
  );
}

export function VehicleListRow({ vehicle: v, format }: VehicleCardProps) {
  const href = `/inventory/${v.slug}`;
  const title = vehicleTitle(v);
  return (
    <article className="group relative flex flex-col border border-ivory-line bg-white transition-shadow hover:shadow-[0_24px_48px_-24px_rgba(16,17,20,0.35)] sm:flex-row">
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-graphite sm:aspect-auto sm:w-[300px]">
        <VehicleImage image={v.images[0]} fallbackAlt={title} sizes="(min-width: 640px) 300px, 100vw" />
        <StatusBadge status={v.status} condition={v.condition} className="absolute left-4 top-4" />
      </div>
      <div className="flex flex-1 flex-col justify-between gap-5 p-6 md:flex-row md:items-center md:px-8">
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
            {v.year} · {v.make} · Stock {v.stockNumber}
          </span>
          <h2 className="font-display text-[26px] font-medium leading-tight">
            <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none">
              {v.model}
              {v.trim ? <span className="text-ink-muted"> {v.trim}</span> : null}
            </Link>
          </h2>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-body">
            <li>{formatMileage(v.mileage, format.mileageUnit, format.locale)}</li>
            <li>{TRANSMISSION_LABELS[v.transmission]}</li>
            <li>{FUEL_LABELS[v.fuelType]}</li>
            <li>{CONDITION_LABELS[v.condition]}</li>
          </ul>
        </div>
        <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
          <span className="text-2xl font-bold tracking-tight">{priceLabel(v, format.locale)}</span>
          <span aria-hidden="true" className="inline-flex min-h-[44px] items-center bg-obsidian px-5 text-xs font-bold uppercase tracking-[0.12em] text-white">
            View details
          </span>
        </div>
      </div>
    </article>
  );
}
