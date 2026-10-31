import Image from "next/image";
import Link from "next/link";
import { Prisma, VehicleStatus } from "@prisma/client";
import { AdminPagination, Badge, Card, EmptyState, PageHeader, TableWrap, Td, Th, adminButton, adminInput } from "@/components/admin/ui";
import { requirePage } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { formatMileage, formatPrice } from "@/lib/utils";
import { vehicleTitle } from "@/lib/vehicles/format";
import { STATUS_LABELS } from "@/lib/vehicles/labels";
import { VehicleRowActions } from "./row-actions";

export const metadata = { title: "Vehicles" };

const PER_PAGE = 20;
const statusTone = { AVAILABLE: "dark", RESERVED: "amber", SOLD: "green", ARCHIVED: "muted" } as const;

type Search = { q?: string; status?: string; published?: string; page?: string; sort?: string };

export default async function AdminVehiclesPage({ searchParams }: { searchParams: Search }) {
  const user = await requirePage("vehicles:read");
  const settings = await getSiteSettings();
  const canWrite = can(user.role, "vehicles:write");
  const page = Math.max(1, Number(searchParams.page) || 1);
  const status = Object.values(VehicleStatus).find((s) => s === searchParams.status);
  const q = searchParams.q?.trim().slice(0, 80);

  const where: Prisma.VehicleWhereInput = {
    ...(status ? { status } : { status: { not: VehicleStatus.ARCHIVED } }),
    ...(searchParams.published === "yes" ? { isPublished: true } : searchParams.published === "no" ? { isPublished: false } : {}),
    ...(q
      ? {
          OR: [
            { make: { contains: q, mode: "insensitive" } },
            { model: { contains: q, mode: "insensitive" } },
            { trim: { contains: q, mode: "insensitive" } },
            { stockNumber: { contains: q, mode: "insensitive" } },
            { vin: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.VehicleOrderByWithRelationInput =
    searchParams.sort === "price" ? { price: "desc" } : searchParams.sort === "views" ? { viewCount: "desc" } : { updatedAt: "desc" };

  const [total, vehicles] = await Promise.all([
    prisma.vehicle.count({ where }),
    prisma.vehicle.findMany({
      where,
      orderBy,
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { images: { orderBy: { position: "asc" }, take: 1 }, _count: { select: { enquiries: true } } },
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const href = (p: number) => `/admin/vehicles?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), ...(searchParams.published ? { published: searchParams.published } : {}), ...(searchParams.sort ? { sort: searchParams.sort } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader
        title="Vehicles"
        description={`${total} ${total === 1 ? "vehicle" : "vehicles"}${status ? ` · ${STATUS_LABELS[status]}` : ""}`}
        actions={
          <>
            {can(user.role, "data:export") ? (
              <a href="/api/admin/vehicles/export" className={adminButton.outline}>
                Export CSV
              </a>
            ) : null}
            {can(user.role, "vehicles:import") ? (
              <Link href="/admin/vehicles/import" className={adminButton.outline}>
                Import CSV
              </Link>
            ) : null}
            {canWrite ? (
              <Link href="/admin/vehicles/new" className={adminButton.dark}>
                + Add vehicle
              </Link>
            ) : null}
          </>
        }
      />

      <form method="get" className="mb-5 flex flex-wrap gap-2.5" role="search">
        <label className="sr-only" htmlFor="vq">Search</label>
        <input id="vq" name="q" defaultValue={q} placeholder="Make, model, stock no. or VIN" className={`${adminInput} w-72`} />
        <select name="status" defaultValue={status ?? ""} aria-label="Status" className={adminInput}>
          <option value="">Active (not archived)</option>
          {Object.values(VehicleStatus).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select name="published" defaultValue={searchParams.published ?? ""} aria-label="Published" className={adminInput}>
          <option value="">Published &amp; drafts</option>
          <option value="yes">Published</option>
          <option value="no">Drafts</option>
        </select>
        <select name="sort" defaultValue={searchParams.sort ?? ""} aria-label="Sort" className={adminInput}>
          <option value="">Recently updated</option>
          <option value="price">Price (high first)</option>
          <option value="views">Most viewed</option>
        </select>
        <button type="submit" className={adminButton.dark}>
          Filter
        </button>
      </form>

      <Card padded={false}>
        {vehicles.length === 0 ? (
          <EmptyState
            title="No vehicles found"
            body={q || status ? "Try different filters." : "Add your first vehicle to start building the inventory."}
            action={canWrite ? <Link href="/admin/vehicles/new" className={adminButton.dark}>Add vehicle</Link> : undefined}
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Vehicle</Th>
                <Th>Stock</Th>
                <Th>Price</Th>
                <Th>Mileage</Th>
                <Th>Status</Th>
                <Th>Views / enq.</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-ivory/60">
                  <Td>
                    <Link href={`/admin/vehicles/${v.id}`} className="flex items-center gap-3">
                      <span className="relative h-11 w-16 shrink-0 overflow-hidden bg-graphite">
                        {v.images[0] ? <Image src={v.images[0].url} alt="" fill sizes="64px" className="object-cover" /> : null}
                      </span>
                      <span className="flex flex-col">
                        <span className="font-semibold hover:text-deepgold">{vehicleTitle(v)}</span>
                        <span className="flex gap-1.5 pt-0.5">
                          {!v.isPublished ? <Badge tone="outline">Draft</Badge> : null}
                          {v.isFeatured ? <Badge tone="amber">Featured</Badge> : null}
                        </span>
                      </span>
                    </Link>
                  </Td>
                  <Td className="font-mono text-xs">{v.stockNumber}</Td>
                  <Td>{v.priceOnRequest ? "On request" : formatPrice(Number(v.price), v.currency, settings.locale)}</Td>
                  <Td>{formatMileage(v.mileage, settings.mileageUnit, settings.locale)}</Td>
                  <Td>
                    <Badge tone={statusTone[v.status]}>{STATUS_LABELS[v.status]}</Badge>
                  </Td>
                  <Td className="text-ink-muted">
                    {v.viewCount} / {v._count.enquiries}
                  </Td>
                  <Td className="text-right">
                    {canWrite ? (
                      <VehicleRowActions
                        id={v.id}
                        slug={v.slug}
                        status={v.status}
                        isFeatured={v.isFeatured}
                        isPublished={v.isPublished}
                        canDelete={can(user.role, "vehicles:delete")}
                      />
                    ) : (
                      <Link href={`/inventory/${v.slug}`} target="_blank" className="text-xs font-semibold underline">
                        View
                      </Link>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
        <AdminPagination page={page} pageCount={pageCount} href={href} />
      </Card>
    </>
  );
}
