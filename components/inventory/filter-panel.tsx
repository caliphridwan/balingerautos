"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import {
  countActiveFilters,
  inventoryHref,
  type InventoryFilters,
} from "@/lib/inventory-params";
import { cn } from "@/lib/utils";

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

export interface FilterPanelProps {
  filters: InventoryFilters;
  total: number;
  makes: Array<{ make: string; count: number }>;
  models: string[];
  colours: string[];
  years: number[];
  bodyTypes: Option<InventoryFilters["body"][number]>[];
  fuels: Option<InventoryFilters["fuel"][number]>[];
  transmissions: Option<InventoryFilters["transmission"][number]>[];
  conditions: Option<InventoryFilters["condition"][number]>[];
  statuses: Option<InventoryFilters["status"][number]>[];
  currencyLabel: string;
  mileageUnit: string;
}

const MILEAGE_STEPS = [5_000, 10_000, 25_000, 50_000, 75_000, 100_000];

const COLOUR_SWATCHES: Record<string, string> = {
  black: "#101114",
  white: "#F7F7F5",
  grey: "#6B7079",
  gray: "#6B7079",
  silver: "#BFC3C8",
  blue: "#1F3557",
  red: "#8E1F24",
  green: "#244233",
  brown: "#5A3D2B",
  beige: "#D8C8A8",
  gold: "#C9A66B",
  burgundy: "#5B1F26",
  orange: "#C8642B",
  yellow: "#D9B43C",
};

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function parseAmount(value: string): number | undefined {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : undefined;
}

export function FilterPanel(props: FilterPanelProps) {
  const { filters } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const activeCount = countActiveFilters(filters);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function apply(next: Partial<InventoryFilters>) {
    startTransition(() => {
      router.push(inventoryHref({ ...filters, ...next, page: 1 }), { scroll: false });
    });
  }

  function clearAll() {
    startTransition(() => {
      router.push(inventoryHref({ sort: filters.sort, view: filters.view }), { scroll: false });
    });
  }

  return (
    <>
      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="inventory-filters"
        className="flex min-h-[52px] w-full items-center justify-center gap-2.5 border border-obsidian bg-white text-xs font-bold uppercase tracking-button lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
        Filters{activeCount > 0 ? ` (${activeCount})` : ""}
      </button>

      <div
        id="inventory-filters"
        className={cn(
          "bg-white lg:block lg:border lg:border-ivory-line",
          open ? "fixed inset-0 z-50 flex flex-col overflow-hidden" : "hidden",
        )}
      >
        <div className="flex items-center justify-between border-b border-ivory-soft px-5 py-4 lg:py-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em]">
            Filters {pending ? <span className="ml-2 font-medium normal-case tracking-normal text-ink-muted">Updating…</span> : null}
          </h2>
          <div className="flex items-center gap-2">
            {activeCount > 0 ? (
              <button
                type="button"
                onClick={clearAll}
                className="min-h-[44px] px-1 text-xs font-bold uppercase tracking-[0.1em] text-deepgold hover:text-obsidian"
              >
                Clear all
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close filters"
              className="inline-flex h-11 w-11 items-center justify-center lg:hidden"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className={cn("flex flex-col divide-y divide-ivory-soft", open && "flex-1 overflow-y-auto")}>
          {/* Manufacturer */}
          {props.makes.length > 0 ? (
            <fieldset className="flex flex-col gap-3 px-5 py-5">
              <legend className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-ink-body">Manufacturer</legend>
              {props.makes.map((m) => {
                const checked = filters.make.some((x) => x.toLowerCase() === m.make.toLowerCase());
                return (
                  <label key={m.make} className="flex min-h-[32px] cursor-pointer items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          apply({
                            make: checked
                              ? filters.make.filter((x) => x.toLowerCase() !== m.make.toLowerCase())
                              : [...filters.make, m.make],
                            model: undefined,
                          })
                        }
                        className="h-[18px] w-[18px] accent-obsidian"
                      />
                      {m.make}
                    </span>
                    <span className="text-[13px] text-ink-muted">{m.count}</span>
                  </label>
                );
              })}
            </fieldset>
          ) : null}

          {/* Model, year */}
          <div className="flex flex-col gap-4 px-5 py-5">
            <label className="field-label">
              Model
              <select
                className="field h-11"
                value={filters.model ?? ""}
                disabled={props.models.length === 0}
                onChange={(e) => apply({ model: e.target.value || undefined })}
              >
                <option value="">{filters.make.length === 0 ? "Choose a make first" : "Any model"}</option>
                {props.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            {props.years.length > 0 ? (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-muted">Year</legend>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="flex flex-col gap-1 text-xs text-ink-muted">
                    From
                    <select
                      className="field h-11"
                      value={filters.yearMin ?? ""}
                      onChange={(e) => apply({ yearMin: e.target.value ? Number(e.target.value) : undefined })}
                    >
                      <option value="">Any</option>
                      {props.years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-ink-muted">
                    To
                    <select
                      className="field h-11"
                      value={filters.yearMax ?? ""}
                      onChange={(e) => apply({ yearMax: e.target.value ? Number(e.target.value) : undefined })}
                    >
                      <option value="">Any</option>
                      {props.years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </fieldset>
            ) : null}
          </div>

          {/* Price + mileage */}
          <form
            className="flex flex-col gap-4 px-5 py-5"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              apply({
                priceMin: parseAmount(String(data.get("priceMin") ?? "")),
                priceMax: parseAmount(String(data.get("priceMax") ?? "")),
              });
            }}
          >
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-muted">
                Price ({props.currencyLabel})
              </legend>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="flex flex-col gap-1 text-xs text-ink-muted">
                  Min
                  <input
                    key={`min-${filters.priceMin ?? ""}`}
                    name="priceMin"
                    inputMode="numeric"
                    defaultValue={filters.priceMin ?? ""}
                    placeholder="0"
                    className="field h-11"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-ink-muted">
                  Max
                  <input
                    key={`max-${filters.priceMax ?? ""}`}
                    name="priceMax"
                    inputMode="numeric"
                    defaultValue={filters.priceMax ?? ""}
                    placeholder="No limit"
                    className="field h-11"
                  />
                </label>
              </div>
              <button
                type="submit"
                className="mt-1 min-h-[44px] border border-obsidian text-xs font-bold uppercase tracking-button hover:bg-obsidian hover:text-white"
              >
                Apply price
              </button>
            </fieldset>
            <label className="field-label">
              Max mileage
              <select
                className="field h-11"
                value={filters.mileageMax ?? ""}
                onChange={(e) => apply({ mileageMax: e.target.value ? Number(e.target.value) : undefined })}
              >
                <option value="">Any mileage</option>
                {MILEAGE_STEPS.map((m) => (
                  <option key={m} value={m}>
                    Up to {m.toLocaleString()} {props.mileageUnit}
                  </option>
                ))}
              </select>
            </label>
          </form>

          {/* Body type chips */}
          <fieldset className="flex flex-col gap-3 px-5 py-5">
            <legend className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-ink-body">Body type</legend>
            <div className="flex flex-wrap gap-2">
              {props.bodyTypes.map((b) => {
                const on = filters.body.includes(b.value);
                return (
                  <button
                    key={b.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => apply({ body: toggle(filters.body, b.value) })}
                    className={cn(
                      "min-h-[38px] rounded border px-3 text-[13px] font-semibold transition-colors",
                      on ? "border-obsidian bg-obsidian text-white" : "border-[#D4D1C8] bg-white hover:border-obsidian",
                    )}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <CheckboxGroup
            legend="Fuel type"
            options={props.fuels}
            selected={filters.fuel}
            onToggle={(v) => apply({ fuel: toggle(filters.fuel, v) })}
          />
          <CheckboxGroup
            legend="Transmission"
            options={props.transmissions}
            selected={filters.transmission}
            onToggle={(v) => apply({ transmission: toggle(filters.transmission, v) })}
          />
          <CheckboxGroup
            legend="Condition"
            options={props.conditions}
            selected={filters.condition}
            onToggle={(v) => apply({ condition: toggle(filters.condition, v) })}
          />
          <CheckboxGroup
            legend="Availability"
            hint="Available and reserved are shown by default."
            options={props.statuses}
            selected={filters.status}
            onToggle={(v) => apply({ status: toggle(filters.status, v) })}
          />

          {/* Colour */}
          {props.colours.length > 0 ? (
            <fieldset className="flex flex-col gap-3 px-5 py-5">
              <legend className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-ink-body">Exterior colour</legend>
              <div className="flex flex-wrap gap-2">
                {props.colours.map((c) => {
                  const on = filters.colour.some((x) => x.toLowerCase() === c.toLowerCase());
                  const swatch = COLOUR_SWATCHES[c.toLowerCase()] ?? "#D4D1C8";
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        apply({
                          colour: on ? filters.colour.filter((x) => x.toLowerCase() !== c.toLowerCase()) : [...filters.colour, c],
                        })
                      }
                      className={cn(
                        "inline-flex min-h-[38px] items-center gap-2 rounded border px-2.5 text-[13px] font-semibold transition-colors",
                        on ? "border-obsidian bg-ivory" : "border-[#D4D1C8] bg-white hover:border-obsidian",
                      )}
                    >
                      <span aria-hidden="true" className="h-4 w-4 rounded-full border border-[#C9C5BA]" style={{ backgroundColor: swatch }} />
                      {c}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}
        </div>

        {open ? (
          <div className="border-t border-ivory-line p-4 lg:hidden">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-[52px] w-full bg-obsidian text-xs font-bold uppercase tracking-button text-white"
            >
              {pending ? "Updating…" : `Show ${props.total} ${props.total === 1 ? "vehicle" : "vehicles"}`}
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}

function CheckboxGroup<T extends string>({
  legend,
  hint,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  hint?: string;
  options: Option<T>[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2.5 px-5 py-5">
      <legend className="mb-2.5 text-xs font-bold uppercase tracking-[0.16em] text-ink-body">{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className="flex min-h-[30px] cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={selected.includes(o.value)}
            onChange={() => onToggle(o.value)}
            className="h-[18px] w-[18px] accent-obsidian"
          />
          {o.label}
        </label>
      ))}
      {hint ? <p className="text-xs text-ink-muted">{hint}</p> : null}
    </fieldset>
  );
}
