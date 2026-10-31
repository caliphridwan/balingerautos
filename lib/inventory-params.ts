/**
 * Inventory filter shape and URL serialisation. No runtime Prisma import, so
 * this file is safe to use from client components.
 */
import type { BodyType, FuelType, TransmissionType, VehicleCondition } from "@prisma/client";

export const SORT_OPTIONS = ["newest", "price_asc", "price_desc", "mileage_asc"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest arrivals",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  mileage_asc: "Mileage: lowest first",
};

export const PAGE_SIZE = 12;

export type PublicStatus = "AVAILABLE" | "RESERVED" | "SOLD";

export interface InventoryFilters {
  q?: string;
  category?: string;
  make: string[];
  model?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  mileageMax?: number;
  body: BodyType[];
  fuel: FuelType[];
  transmission: TransmissionType[];
  condition: VehicleCondition[];
  colour: string[];
  /** Empty = default (available + reserved). */
  status: PublicStatus[];
  sort: SortOption;
  view: "grid" | "list";
  page: number;
}

/** Serialises filters into a query string, omitting defaults. */
export function serializeInventoryParams(filters: Partial<InventoryFilters>): string {
  const params = new URLSearchParams();
  const setList = (key: string, values?: readonly string[]) => {
    if (values && values.length > 0) params.set(key, values.join(","));
  };
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  setList("make", filters.make);
  if (filters.model) params.set("model", filters.model);
  if (filters.yearMin) params.set("yearMin", String(filters.yearMin));
  if (filters.yearMax) params.set("yearMax", String(filters.yearMax));
  if (filters.priceMin !== undefined) params.set("priceMin", String(filters.priceMin));
  if (filters.priceMax !== undefined) params.set("priceMax", String(filters.priceMax));
  if (filters.mileageMax !== undefined) params.set("mileageMax", String(filters.mileageMax));
  setList("body", filters.body);
  setList("fuel", filters.fuel);
  setList("transmission", filters.transmission);
  setList("condition", filters.condition);
  setList("colour", filters.colour);
  setList("status", filters.status);
  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.view === "list") params.set("view", "list");
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}

export function inventoryHref(filters: Partial<InventoryFilters>): string {
  const qs = serializeInventoryParams(filters);
  return qs ? `/inventory?${qs}` : "/inventory";
}

/** Filters that narrow results (excludes sort, view and page). */
export function countActiveFilters(f: InventoryFilters): number {
  return (
    (f.q ? 1 : 0) +
    (f.category ? 1 : 0) +
    f.make.length +
    (f.model ? 1 : 0) +
    (f.yearMin || f.yearMax ? 1 : 0) +
    (f.priceMin !== undefined || f.priceMax !== undefined ? 1 : 0) +
    (f.mileageMax !== undefined ? 1 : 0) +
    f.body.length +
    f.fuel.length +
    f.transmission.length +
    f.condition.length +
    f.colour.length +
    f.status.length
  );
}
