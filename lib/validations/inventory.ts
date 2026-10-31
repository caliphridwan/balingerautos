import { z } from "zod";
import {
  BodyType,
  FuelType,
  TransmissionType,
  VehicleCondition,
  VehicleStatus,
} from "@prisma/client";
import { SORT_OPTIONS, type InventoryFilters, type SortOption } from "@/lib/inventory-params";

/**
 * Parses inventory search parameters from the URL. Lenient by design:
 * anything malformed in a shared link is dropped instead of erroring.
 */

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  const trimmed = v?.trim();
  return trimmed ? trimmed : undefined;
}

/** Accepts `a,b` or repeated keys `?x=a&x=b`. */
function list(value: string | string[] | undefined): string[] {
  const parts = (Array.isArray(value) ? value : value ? [value] : [])
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
  return Array.from(new Set(parts)).slice(0, 20);
}

const intInRange = (min: number, max: number) =>
  z.coerce.number().int().min(min).max(max).optional().catch(undefined);

function enumList<T extends Record<string, string>>(values: T) {
  const allowed = new Set<string>(Object.values(values));
  return (input: string[]) =>
    input.map((v) => v.toUpperCase()).filter((v): v is T[keyof T] => allowed.has(v));
}

const optionalText = (max: number) => z.string().max(max).optional().catch(undefined);
const categorySlug = z.string().regex(/^[a-z0-9-]{1,60}$/).optional().catch(undefined);

const parseBody = enumList(BodyType);
const parseFuel = enumList(FuelType);
const parseTransmission = enumList(TransmissionType);
const parseCondition = enumList(VehicleCondition);
const parseStatus = enumList({
  AVAILABLE: VehicleStatus.AVAILABLE,
  RESERVED: VehicleStatus.RESERVED,
  SOLD: VehicleStatus.SOLD,
});

export function parseInventoryParams(raw: RawParams): InventoryFilters {
  const sortRaw = first(raw.sort) ?? "";
  const sort: SortOption = (SORT_OPTIONS as readonly string[]).includes(sortRaw) ? (sortRaw as SortOption) : "newest";

  let yearMin = intInRange(1950, 2100).parse(first(raw.yearMin));
  let yearMax = intInRange(1950, 2100).parse(first(raw.yearMax));
  if (yearMin !== undefined && yearMax !== undefined && yearMin > yearMax) [yearMin, yearMax] = [yearMax, yearMin];

  let priceMin = intInRange(0, 100_000_000_000).parse(first(raw.priceMin));
  let priceMax = intInRange(0, 100_000_000_000).parse(first(raw.priceMax));
  if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) [priceMin, priceMax] = [priceMax, priceMin];

  return {
    q: optionalText(80).parse(first(raw.q)),
    category: categorySlug.parse(first(raw.category)),
    make: list(raw.make).map((m) => m.slice(0, 60)),
    model: optionalText(60).parse(first(raw.model)),
    yearMin,
    yearMax,
    priceMin,
    priceMax,
    mileageMax: intInRange(0, 2_000_000).parse(first(raw.mileageMax)),
    body: parseBody(list(raw.body)),
    fuel: parseFuel(list(raw.fuel)),
    transmission: parseTransmission(list(raw.transmission)),
    condition: parseCondition(list(raw.condition)),
    colour: list(raw.colour).map((c) => c.slice(0, 40)),
    status: parseStatus(list(raw.status)),
    sort,
    view: first(raw.view) === "list" ? "list" : "grid",
    page: intInRange(1, 10_000).parse(first(raw.page)) ?? 1,
  };
}
