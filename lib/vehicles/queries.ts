import "server-only";
import { Prisma, VehicleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE, type InventoryFilters } from "@/lib/inventory-params";

/** Fields needed to render a vehicle card. */
export const vehicleCardSelect = {
  id: true,
  slug: true,
  stockNumber: true,
  make: true,
  model: true,
  trim: true,
  year: true,
  price: true,
  currency: true,
  priceOnRequest: true,
  mileage: true,
  transmission: true,
  fuelType: true,
  condition: true,
  status: true,
  bodyType: true,
  exteriorColour: true,
  createdAt: true,
  images: {
    orderBy: { position: "asc" },
    take: 1,
    select: { url: true, alt: true, width: true, height: true },
  },
} satisfies Prisma.VehicleSelect;

export type VehicleCardData = Prisma.VehicleGetPayload<{ select: typeof vehicleCardSelect }>;

/** Only published, non-archived vehicles are ever public. */
const publicWhere: Prisma.VehicleWhereInput = {
  isPublished: true,
  status: { not: VehicleStatus.ARCHIVED },
};

export function buildInventoryWhere(filters: InventoryFilters): Prisma.VehicleWhereInput {
  const and: Prisma.VehicleWhereInput[] = [publicWhere];

  if (filters.q) {
    const terms = filters.q.split(/\s+/).filter(Boolean).slice(0, 6);
    for (const term of terms) {
      const asYear = /^\d{4}$/.test(term) ? Number(term) : undefined;
      and.push({
        OR: [
          { make: { contains: term, mode: "insensitive" } },
          { model: { contains: term, mode: "insensitive" } },
          { trim: { contains: term, mode: "insensitive" } },
          { stockNumber: { contains: term, mode: "insensitive" } },
          { exteriorColour: { contains: term, mode: "insensitive" } },
          ...(asYear ? [{ year: asYear }] : []),
        ],
      });
    }
  }

  if (filters.category) and.push({ categories: { some: { slug: filters.category } } });

  if (filters.make.length > 0) {
    and.push({ OR: filters.make.map((make) => ({ make: { equals: make, mode: "insensitive" as const } })) });
  }
  if (filters.model) and.push({ model: { equals: filters.model, mode: "insensitive" } });

  if (filters.yearMin || filters.yearMax) {
    and.push({ year: { gte: filters.yearMin, lte: filters.yearMax } });
  }
  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    and.push({ price: { gte: filters.priceMin, lte: filters.priceMax } });
  }
  if (filters.mileageMax !== undefined) and.push({ mileage: { lte: filters.mileageMax } });

  if (filters.body.length > 0) and.push({ bodyType: { in: filters.body } });
  if (filters.fuel.length > 0) and.push({ fuelType: { in: filters.fuel } });
  if (filters.transmission.length > 0) and.push({ transmission: { in: filters.transmission } });
  if (filters.condition.length > 0) and.push({ condition: { in: filters.condition } });
  if (filters.colour.length > 0) {
    and.push({ OR: filters.colour.map((c) => ({ exteriorColour: { equals: c, mode: "insensitive" as const } })) });
  }

  const statuses = filters.status.length > 0 ? filters.status : [VehicleStatus.AVAILABLE, VehicleStatus.RESERVED];
  and.push({ status: { in: statuses } });

  return { AND: and };
}

function buildOrderBy(sort: InventoryFilters["sort"]): Prisma.VehicleOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ price: "asc" }, { id: "asc" }];
    case "price_desc":
      return [{ price: "desc" }, { id: "asc" }];
    case "mileage_asc":
      return [{ mileage: "asc" }, { id: "asc" }];
    case "newest":
    default:
      return [{ publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }, { id: "asc" }];
  }
}

export async function searchInventory(filters: InventoryFilters) {
  const where = buildInventoryWhere(filters);
  const total = await prisma.vehicle.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(filters.page, pageCount);
  const vehicles = await prisma.vehicle.findMany({
    where,
    orderBy: buildOrderBy(filters.sort),
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: vehicleCardSelect,
  });
  return { vehicles, total, page, pageCount };
}

export interface InventoryFacets {
  makes: Array<{ make: string; count: number }>;
  models: string[];
  colours: string[];
  yearRange: { min: number; max: number } | null;
}

/** Filter options, drawn from the live public inventory. */
export async function getInventoryFacets(selectedMakes: string[]): Promise<InventoryFacets> {
  const [makes, colours, years, models] = await Promise.all([
    prisma.vehicle.groupBy({
      by: ["make"],
      where: { ...publicWhere, status: { in: [VehicleStatus.AVAILABLE, VehicleStatus.RESERVED] } },
      _count: { _all: true },
      orderBy: { make: "asc" },
    }),
    prisma.vehicle.findMany({
      where: publicWhere,
      distinct: ["exteriorColour"],
      select: { exteriorColour: true },
      orderBy: { exteriorColour: "asc" },
    }),
    prisma.vehicle.aggregate({ where: publicWhere, _min: { year: true }, _max: { year: true } }),
    selectedMakes.length > 0
      ? prisma.vehicle.findMany({
          where: {
            ...publicWhere,
            OR: selectedMakes.map((make) => ({ make: { equals: make, mode: "insensitive" as const } })),
          },
          distinct: ["model"],
          select: { model: true },
          orderBy: { model: "asc" },
        })
      : Promise.resolve([] as Array<{ model: string }>),
  ]);

  return {
    makes: makes.map((m) => ({ make: m.make, count: m._count._all })),
    models: models.map((m) => m.model),
    colours: colours.map((c) => c.exteriorColour),
    yearRange:
      years._min.year !== null && years._max.year !== null
        ? { min: years._min.year, max: years._max.year }
        : null,
  };
}

export async function getFeaturedVehicles(limit = 3): Promise<VehicleCardData[]> {
  return prisma.vehicle.findMany({
    where: { ...publicWhere, isFeatured: true, status: { in: [VehicleStatus.AVAILABLE, VehicleStatus.RESERVED] } },
    orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: limit,
    select: vehicleCardSelect,
  });
}

export async function getLatestArrivals(limit = 4, excludeIds: string[] = []): Promise<VehicleCardData[]> {
  return prisma.vehicle.findMany({
    where: {
      ...publicWhere,
      status: { in: [VehicleStatus.AVAILABLE, VehicleStatus.RESERVED] },
      id: { notIn: excludeIds },
    },
    orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: limit,
    select: vehicleCardSelect,
  });
}

export async function countAvailableVehicles(): Promise<number> {
  return prisma.vehicle.count({ where: { ...publicWhere, status: VehicleStatus.AVAILABLE } });
}

export async function getVisibleCategories() {
  const categories = await prisma.vehicleCategory.findMany({
    where: { isVisible: true },
    orderBy: { position: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: {
          vehicles: { where: { ...publicWhere, status: { in: [VehicleStatus.AVAILABLE, VehicleStatus.RESERVED] } } },
        },
      },
    },
  });
  return categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, count: c._count.vehicles }));
}
