import Link from "next/link";
import { EnquiryStatus, EnquiryType, Prisma } from "@prisma/client";
import { AdminPagination, Badge, Card, EmptyState, PageHeader, TableWrap, Td, Th, adminButton, adminInput } from "@/components/admin/ui";
import { requirePage } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { enquiryScope } from "@/lib/leads/access";
import { ENQUIRY_STATUS_LABELS, ENQUIRY_TYPE_LABELS } from "@/lib/leads/labels";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { formatInZone, zonedToUtc } from "@/lib/time";
import { vehicleTitle } from "@/lib/vehicles/format";
import { enquiryStatusTone } from "./tones";

export const metadata = { title: "Enquiries" };

const PER_PAGE = 25;
type Search = { q?: string; type?: string; status?: string; from?: string; to?: string; assigned?: string; followup?: string; page?: string };

export default async function EnquiriesPage({ searchParams }: { searchParams: Search }) {
  const user = await requirePage("enquiries:write");
  const settings = await getSiteSettings();
  const tz = settings.timezone;
  const allLeads = can(user.role, "enquiries:read_all");
  const page = Math.max(1, Number(searchParams.page) || 1);
  const type = Object.values(EnquiryType).find((t) => t === searchParams.type);
  const status = Object.values(EnquiryStatus).find((s) => s === searchParams.status);
  const q = searchParams.q?.trim().slice(0, 80);
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const from = searchParams.from && dateRe.test(searchParams.from) ? zonedToUtc(searchParams.from, "00:00", tz) : undefined;
  const to = searchParams.to && dateRe.test(searchParams.to) ? new Date(zonedToUtc(searchParams.to, "00:00", tz).getTime() + 86_400_000) : undefined;

  const and: Prisma.VehicleEnquiryWhereInput[] = [enquiryScope(user)];
  if (type) and.push({ type });
  if (status) and.push({ status });
  if (from || to) and.push({ createdAt: { gte: from, lt: to } });
  if (searchParams.followup === "due") and.push({ followUpAt: { lte: new Date() }, status: { notIn: [EnquiryStatus.CLOSED, EnquiryStatus.CANCELLED, EnquiryStatus.CONVERTED] } });
  if (allLeads && searchParams.assigned === "me") and.push({ assignments: { some: { userId: user.id, isActive: true } } });
  if (allLeads && searchParams.assigned === "none") and.push({ assignments: { none: { isActive: true } } });
  if (q) {
    and.push({
      OR: [
        { reference: { contains: q, mode: "insensitive" } },
        { message: { contains: q, mode: "insensitive" } },
        { customer: { fullName: { contains: q, mode: "insensitive" } } },
        { customer: { email: { contains: q, mode: "insensitive" } } },
        { customer: { phone: { contains: q } } },
        { vehicle: { stockNumber: { contains: q, mode: "insensitive" } } },
        { vehicle: { model: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  const where: Prisma.VehicleEnquiryWhereInput = { AND: and };

  const [total, enquiries] = await Promise.all([
    prisma.vehicleEnquiry.count({ where }),
    prisma.vehicleEnquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        customer: { select: { fullName: true, email: true, phone: true } },
        vehicle: { select: { year: true, make: true, model: true, trim: true, stockNumber: true } },
        assignments: { where: { isActive: true }, include: { user: { select: { name: true } } } },
      },
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const keep = Object.fromEntries(Object.entries(searchParams).filter(([k, v]) => k !== "page" && v)) as Record<string, string>;
  const href = (p: number) => `/admin/enquiries?${new URLSearchParams({ ...keep, page: String(p) })}`;

  return (
    <>
      <PageHeader
        title="Enquiries"
        description={`${total} ${total === 1 ? "enquiry" : "enquiries"}${allLeads ? "" : " assigned to you"}`}
        actions={
          can(user.role, "data:export") ? (
            <a href={`/api/admin/enquiries/export?${new URLSearchParams(keep)}`} className={adminButton.outline}>
              Export CSV
            </a>
          ) : undefined
        }
      />

      <form method="get" role="search" className="mb-5 flex flex-wrap items-end gap-2.5">
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Search
          <input name="q" defaultValue={q} placeholder="Name, email, phone, reference, stock no." className={`${adminInput} w-72`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Type
          <select name="type" defaultValue={type ?? ""} className={adminInput}>
            <option value="">All types</option>
            {Object.values(EnquiryType).map((t) => (
              <option key={t} value={t}>{ENQUIRY_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          Status
          <select name="status" defaultValue={status ?? ""} className={adminInput}>
            <option value="">All statuses</option>
            {Object.values(EnquiryStatus).map((s) => (
              <option key={s} value={s}>{ENQUIRY_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          From
          <input type="date" name="from" defaultValue={searchParams.from} className={adminInput} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          To
          <input type="date" name="to" defaultValue={searchParams.to} className={adminInput} />
        </label>
        {allLeads ? (
          <label className="flex flex-col gap-1 text-xs text-ink-muted">
            Assigned
            <select name="assigned" defaultValue={searchParams.assigned ?? ""} className={adminInput}>
              <option value="">Anyone</option>
              <option value="me">Me</option>
              <option value="none">Unassigned</option>
            </select>
          </label>
        ) : null}
        <label className="flex h-10 items-center gap-2 text-sm">
          <input type="checkbox" name="followup" value="due" defaultChecked={searchParams.followup === "due"} className="h-4 w-4 accent-obsidian" />
          Follow-ups due
        </label>
        <button type="submit" className={adminButton.dark}>Filter</button>
        {Object.keys(keep).length ? (
          <Link href="/admin/enquiries" className="h-10 px-2 text-xs font-bold uppercase leading-10 tracking-[0.08em] text-deepgold">Clear</Link>
        ) : null}
      </form>

      <Card padded={false}>
        {enquiries.length === 0 ? (
          <EmptyState title="No enquiries match" body="Try widening the filters." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Customer</Th>
                <Th>Type</Th>
                <Th>Vehicle</Th>
                <Th>Assigned</Th>
                <Th>Status</Th>
                <Th>Follow-up</Th>
                <Th>Received</Th>
              </tr>
            </thead>
            <tbody>
              {enquiries.map((e) => {
                const overdue = e.followUpAt && e.followUpAt < new Date() && !["CLOSED", "CANCELLED", "CONVERTED"].includes(e.status);
                return (
                  <tr key={e.id} className="hover:bg-ivory/60">
                    <Td>
                      <Link href={`/admin/enquiries/${e.id}`} className="flex flex-col">
                        <span className="font-semibold hover:text-deepgold">{e.customer.fullName}</span>
                        <span className="text-xs text-ink-muted">{e.reference} · {e.customer.email}</span>
                      </Link>
                    </Td>
                    <Td>{ENQUIRY_TYPE_LABELS[e.type]}</Td>
                    <Td className="max-w-[220px] truncate">{e.vehicle ? `${vehicleTitle(e.vehicle)} · ${e.vehicle.stockNumber}` : "—"}</Td>
                    <Td>{e.assignments[0]?.user.name ?? <span className="text-ink-muted">Unassigned</span>}</Td>
                    <Td><Badge tone={enquiryStatusTone[e.status]}>{ENQUIRY_STATUS_LABELS[e.status]}</Badge></Td>
                    <Td className={overdue ? "font-semibold text-[#9F3A2B]" : "text-ink-muted"}>
                      {e.followUpAt ? formatInZone(e.followUpAt, tz, settings.locale, { dateStyle: "medium" }) : "—"}
                    </Td>
                    <Td className="whitespace-nowrap text-ink-muted">{formatInZone(e.createdAt, tz, settings.locale, { dateStyle: "short", timeStyle: "short" })}</Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
        <AdminPagination page={page} pageCount={pageCount} href={href} />
      </Card>
    </>
  );
}
