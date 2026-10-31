import Link from "next/link";
import { ChevronLeft, ChevronRight, LayoutGrid, List, X } from "lucide-react";
import { inventoryHref, type InventoryFilters } from "@/lib/inventory-params";
import { cn } from "@/lib/utils";

// ── Grid / list toggle (plain links: works without JavaScript) ─────────

export function ViewToggle({ filters }: { filters: InventoryFilters }) {
  const items = [
    { view: "grid" as const, label: "Grid view", Icon: LayoutGrid },
    { view: "list" as const, label: "List view", Icon: List },
  ];
  return (
    <div role="group" aria-label="Display" className="flex border border-[#D4D1C8]">
      {items.map(({ view, label, Icon }, i) => {
        const active = filters.view === view;
        return (
          <Link
            key={view}
            href={inventoryHref({ ...filters, view })}
            scroll={false}
            aria-label={label}
            aria-current={active ? "true" : undefined}
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center transition-colors",
              i > 0 && "border-l border-[#D4D1C8]",
              active ? "bg-obsidian text-white" : "bg-white text-obsidian hover:bg-ivory",
            )}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} aria-hidden="true" />
          </Link>
        );
      })}
    </div>
  );
}

// ── Active filter chips ───────────────────────────────────────────────

export interface ActiveChip {
  label: string;
  href: string;
}

export function ActiveFilters({ chips, clearHref }: { chips: ActiveChip[]; clearHref: string }) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">Active</span>
      {chips.map((chip) => (
        <Link
          key={chip.label}
          href={chip.href}
          scroll={false}
          className="inline-flex min-h-[36px] items-center gap-2 rounded bg-obsidian px-3 text-[13px] font-semibold text-white transition-colors hover:bg-graphite"
        >
          {chip.label}
          <X className="h-3.5 w-3.5 text-champagne" strokeWidth={2} aria-hidden="true" />
          <span className="sr-only">Remove filter</span>
        </Link>
      ))}
      <Link
        href={clearHref}
        scroll={false}
        className="min-h-[36px] px-1 text-xs font-bold uppercase tracking-[0.1em] text-deepgold underline underline-offset-4 hover:text-obsidian"
      >
        Clear all
      </Link>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────

function pageWindow(page: number, pageCount: number): Array<number | "gap"> {
  const pages = new Set<number>([1, pageCount, page - 1, page, page + 1]);
  const sorted = Array.from(pages).filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const result: Array<number | "gap"> = [];
  sorted.forEach((p, i) => {
    const prev = sorted[i - 1];
    if (prev !== undefined && p - prev > 1) result.push("gap");
    result.push(p);
  });
  return result;
}

export function Pagination({
  filters,
  page,
  pageCount,
}: {
  filters: InventoryFilters;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;
  const cell = "inline-flex h-11 min-w-[44px] items-center justify-center border px-2 text-sm transition-colors";
  return (
    <nav aria-label="Pagination" className="mt-6 flex flex-wrap justify-center gap-1.5">
      {page > 1 ? (
        <Link href={inventoryHref({ ...filters, page: page - 1 })} aria-label="Previous page" className={cn(cell, "border-[#D4D1C8] hover:border-obsidian")}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : null}
      {pageWindow(page, pageCount).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} aria-hidden="true" className="inline-flex h-11 items-center px-1 text-ink-muted">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={inventoryHref({ ...filters, page: p })}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              cell,
              p === page ? "border-obsidian bg-obsidian font-bold text-white" : "border-[#D4D1C8] hover:border-obsidian",
            )}
          >
            {p}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={inventoryHref({ ...filters, page: page + 1 })} aria-label="Next page" className={cn(cell, "border-[#D4D1C8] hover:border-obsidian")}>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : null}
    </nav>
  );
}

// ── Empty state ───────────────────────────────────────────────────────

export function EmptyResults({ clearHref, hasFilters }: { clearHref: string; hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 border border-dashed border-[#C9C5BA] bg-white px-6 py-16 text-center">
      <h2 className="font-display text-[30px]">
        {hasFilters ? "No vehicles match these filters" : "Our collection is being refreshed"}
      </h2>
      <p className="max-w-md text-[15px] leading-relaxed text-[#4A4D55]">
        {hasFilters
          ? "Try widening your price or year range, or let our team source the exact vehicle you’re looking for."
          : "New vehicles are added regularly. Speak with our team about what you’re looking for."}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {hasFilters ? (
          <Link
            href={clearHref}
            className="inline-flex min-h-[48px] items-center bg-obsidian px-6 text-xs font-bold uppercase tracking-[0.12em] text-white hover:bg-graphite"
          >
            Clear filters
          </Link>
        ) : null}
        <Link
          href="/services#sourcing"
          className="inline-flex min-h-[48px] items-center border border-obsidian px-6 text-xs font-bold uppercase tracking-[0.12em] hover:bg-obsidian hover:text-white"
        >
          Request vehicle sourcing
        </Link>
      </div>
    </div>
  );
}
