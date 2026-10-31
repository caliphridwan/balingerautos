import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { FilterPanel } from "@/components/inventory/filter-panel";
import {
  ActiveFilters,
  EmptyResults,
  Pagination,
  ViewToggle,
  type ActiveChip,
} from "@/components/inventory/results-chrome";
import { SortSelect } from "@/components/inventory/sort-select";
import { VehicleCard, VehicleListRow } from "@/components/vehicles/vehicle-card";
import { PAGE_SIZE, countActiveFilters, inventoryHref, type InventoryFilters } from "@/lib/inventory-params";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { formatNumber, formatPrice } from "@/lib/utils";
import { parseInventoryParams } from "@/lib/validations/inventory";
import {
  BODY_TYPES,
  BODY_TYPE_LABELS,
  CONDITIONS,
  CONDITION_LABELS,
  FUEL_LABELS,
  FUEL_TYPES,
  STATUS_LABELS,
  TRANSMISSIONS,
  TRANSMISSION_LABELS,
} from "@/lib/vehicles/labels";
import { getInventoryFacets, searchInventory } from "@/lib/vehicles/queries";

type PageProps = { searchParams: Record<string, string | string[] | undefined> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const filters = parseInventoryParams(searchParams);
  const filtered = countActiveFilters(filters) > 0 || filters.page > 1;
  return {
    title: "Vehicle Inventory",
    description: "Browse our collection of exceptional new and pre-owned vehicles. Filter by make, model, price, body type and more.",
    alternates: { canonical: "/inventory" },
    // Filtered permutations shouldn't compete with the canonical listing.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

function without(filters: InventoryFilters, patch: Partial<InventoryFilters>): string {
  return inventoryHref({ ...filters, ...patch, page: 1 });
}

function buildChips(f: InventoryFilters, money: (n: number) => string, mileageUnit: string, categoryName?: string): ActiveChip[] {
  const chips: ActiveChip[] = [];
  if (f.q) chips.push({ label: `“${f.q}”`, href: without(f, { q: undefined }) });
  if (f.category) chips.push({ label: categoryName ?? f.category, href: without(f, { category: undefined }) });
  for (const make of f.make) {
    chips.push({ label: make, href: without(f, { make: f.make.filter((m) => m !== make), model: undefined }) });
  }
  if (f.model) chips.push({ label: f.model, href: without(f, { model: undefined }) });
  if (f.yearMin || f.yearMax) {
    const label = f.yearMin && f.yearMax ? `${f.yearMin}–${f.yearMax}` : f.yearMin ? `From ${f.yearMin}` : `Up to ${f.yearMax}`;
    chips.push({ label, href: without(f, { yearMin: undefined, yearMax: undefined }) });
  }
  if (f.priceMin !== undefined || f.priceMax !== undefined) {
    const label =
      f.priceMin !== undefined && f.priceMax !== undefined
        ? `${money(f.priceMin)}–${money(f.priceMax)}`
        : f.priceMin !== undefined
          ? `From ${money(f.priceMin)}`
          : `Up to ${money(f.priceMax ?? 0)}`;
    chips.push({ label, href: without(f, { priceMin: undefined, priceMax: undefined }) });
  }
  if (f.mileageMax !== undefined) {
    chips.push({ label: `≤ ${formatNumber(f.mileageMax)} ${mileageUnit}`, href: without(f, { mileageMax: undefined }) });
  }
  for (const b of f.body) chips.push({ label: BODY_TYPE_LABELS[b], href: without(f, { body: f.body.filter((x) => x !== b) }) });
  for (const x of f.fuel) chips.push({ label: FUEL_LABELS[x], href: without(f, { fuel: f.fuel.filter((y) => y !== x) }) });
  for (const t of f.transmission) {
    chips.push({ label: TRANSMISSION_LABELS[t], href: without(f, { transmission: f.transmission.filter((y) => y !== t) }) });
  }
  for (const c of f.condition) {
    chips.push({ label: CONDITION_LABELS[c], href: without(f, { condition: f.condition.filter((y) => y !== c) }) });
  }
  for (const c of f.colour) chips.push({ label: c, href: without(f, { colour: f.colour.filter((y) => y !== c) }) });
  for (const s of f.status) chips.push({ label: STATUS_LABELS[s], href: without(f, { status: f.status.filter((y) => y !== s) }) });
  return chips;
}

export default async function InventoryPage({ searchParams }: PageProps) {
  const filters = parseInventoryParams(searchParams);
  const settings = await getSiteSettings();

  const [{ vehicles, total, page, pageCount }, facets, category] = await Promise.all([
    searchInventory(filters),
    getInventoryFacets(filters.make),
    filters.category
      ? prisma.vehicleCategory.findUnique({ where: { slug: filters.category }, select: { name: true } })
      : Promise.resolve(null),
  ]);

  // Search analytics: record filtered searches on page 1 (non-blocking).
  if (page === 1 && countActiveFilters(filters) > 0) {
    const { sort: _sort, view: _view, page: _page, ...searched } = filters;
    void prisma.searchEvent
      .create({ data: { query: filters.q ?? null, filters: JSON.parse(JSON.stringify(searched)) as Prisma.InputJsonValue, resultCount: total } })
      .catch((e: unknown) => console.error("[search-log]", e));
  }

  const format = { locale: settings.locale, mileageUnit: settings.mileageUnit };
  const money = (n: number) => formatPrice(n, settings.currency, settings.locale);
  const chips = buildChips(filters, money, settings.mileageUnit, category?.name);
  const clearHref = inventoryHref({ sort: filters.sort, view: filters.view });
  const effective = { ...filters, page };

  const years: number[] = [];
  if (facets.yearRange) {
    for (let y = facets.yearRange.max; y >= facets.yearRange.min; y -= 1) years.push(y);
  }

  const currencyLabel =
    new Intl.NumberFormat(settings.locale, { style: "currency", currency: settings.currency })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? settings.currency;

  const firstShown = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  return (
    <>
      <section className="border-t border-graphite-line bg-obsidian text-white">
        <div className="mx-auto flex max-w-content flex-col gap-6 px-6 pb-12 pt-14">
          <nav aria-label="Breadcrumb">
            <ol className="flex gap-2.5 text-[13px] text-mist-dim">
              <li>
                <Link href="/" className="text-mist hover:text-champagne">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-white">
                Inventory
              </li>
            </ol>
          </nav>
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <h1 className="heading-display text-[clamp(2.4rem,5vw,4rem)] leading-[1.05]">
              {category ? category.name : "The Collection"}
            </h1>
            <form action="/inventory" method="get" role="search" className="flex w-full max-w-lg border border-graphite-muted bg-graphite focus-within:border-champagne">
              <label htmlFor="inventory-q" className="sr-only">
                Search vehicles
              </label>
              <input
                id="inventory-q"
                name="q"
                type="search"
                defaultValue={filters.q ?? ""}
                placeholder="Search make, model or keyword"
                className="h-14 min-w-0 flex-1 bg-transparent px-5 text-[15px] text-white placeholder:text-mist-dim focus:outline-none"
              />
              {/* Keep other filters when searching */}
              {Array.from(new URLSearchParams(inventoryHref({ ...filters, q: undefined, page: 1 }).split("?")[1] ?? "")).map(
                ([key, value]) => (
                  <input key={key} type="hidden" name={key} value={value} />
                ),
              )}
              <button type="submit" aria-label="Search" className="inline-flex w-14 items-center justify-center bg-champagne text-obsidian hover:bg-champagne-hover">
                <Search className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </button>
            </form>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-content flex-col gap-10 px-6 pb-24 pt-10 lg:flex-row lg:items-start">
        <aside aria-label="Filters" className="w-full shrink-0 lg:w-[300px]">
          <FilterPanel
            filters={effective}
            total={total}
            makes={facets.makes}
            models={facets.models}
            colours={facets.colours}
            years={years}
            bodyTypes={BODY_TYPES.map((value) => ({ value, label: BODY_TYPE_LABELS[value] }))}
            fuels={FUEL_TYPES.map((value) => ({ value, label: FUEL_LABELS[value] }))}
            transmissions={TRANSMISSIONS.map((value) => ({ value, label: TRANSMISSION_LABELS[value] }))}
            conditions={CONDITIONS.map((value) => ({ value, label: CONDITION_LABELS[value] }))}
            statuses={(["AVAILABLE", "RESERVED", "SOLD"] as const).map((value) => ({ value, label: STATUS_LABELS[value] }))}
            currencyLabel={currencyLabel}
            mileageUnit={settings.mileageUnit}
          />
        </aside>

        <section aria-labelledby="results-heading" className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p id="results-heading" role="status" className="text-[15px] text-ink-body">
              {total === 0 ? (
                "No matching vehicles"
              ) : (
                <>
                  Showing <strong className="text-obsidian">{firstShown}–{firstShown + vehicles.length - 1}</strong> of{" "}
                  <strong className="text-obsidian">{total}</strong> {total === 1 ? "vehicle" : "vehicles"}
                </>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <SortSelect filters={effective} />
              <ViewToggle filters={effective} />
            </div>
          </div>

          <ActiveFilters chips={chips} clearHref={clearHref} />

          {vehicles.length === 0 ? (
            <EmptyResults clearHref={clearHref} hasFilters={chips.length > 0} />
          ) : filters.view === "list" ? (
            <ul className="flex flex-col gap-4">
              {vehicles.map((v) => (
                <li key={v.id}>
                  <VehicleListRow vehicle={v} format={format} />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {vehicles.map((v, i) => (
                <li key={v.id} className="flex [&>article]:flex-1">
                  <VehicleCard vehicle={v} format={format} priority={i < 3} headingLevel="h2" />
                </li>
              ))}
            </ul>
          )}

          <Pagination filters={effective} page={page} pageCount={pageCount} />
        </section>
      </div>
    </>
  );
}
