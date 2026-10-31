import Link from "next/link";
import { AppointmentStatus, EnquiryStatus, VehicleStatus } from "@prisma/client";
import { Badge, Card, EmptyState, PageHeader, StatTile } from "@/components/admin/ui";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/appointments";
import { requirePage } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { ENQUIRY_STATUS_LABELS, ENQUIRY_TYPE_LABELS } from "@/lib/leads/labels";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { formatInZone } from "@/lib/time";
import { vehicleTitle } from "@/lib/vehicles/format";
import { enquiryStatusTone } from "./enquiries/tones";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: { denied?: string } }) {
  const user = await requirePage("dashboard:view");
  const settings = await getSiteSettings();
  const tz = settings.timezone;
  const allLeads = can(user.role, "enquiries:read_all");
  const allAppts = can(user.role, "appointments:read_all");
  const leadScope = allLeads ? {} : { assignments: { some: { userId: user.id, isActive: true } } };
  const apptScope = allAppts ? {} : { assignedToId: user.id };
  const since30 = new Date(Date.now() - 30 * 86_400_000);

  const [statusCounts, totalEnquiries, newEnquiries, pending, confirmed, recentEnquiries, upcoming, activity, topViewed, enquiries30] =
    await Promise.all([
      prisma.vehicle.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.vehicleEnquiry.count({ where: leadScope }),
      prisma.vehicleEnquiry.count({ where: { ...leadScope, status: EnquiryStatus.NEW } }),
      prisma.testDriveBooking.count({ where: { ...apptScope, status: AppointmentStatus.PENDING } }),
      prisma.testDriveBooking.count({
        where: { ...apptScope, status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED] }, scheduledAt: { gte: new Date() } },
      }),
      prisma.vehicleEnquiry.findMany({
        where: leadScope,
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          customer: { select: { fullName: true } },
          vehicle: { select: { year: true, make: true, model: true, trim: true } },
          assignments: { where: { isActive: true }, include: { user: { select: { name: true } } } },
        },
      }),
      prisma.testDriveBooking.findMany({
        where: { ...apptScope, status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED] }, scheduledAt: { gte: new Date() } },
        orderBy: { scheduledAt: "asc" },
        take: 6,
        include: { customer: { select: { fullName: true } }, vehicle: { select: { year: true, make: true, model: true, trim: true } } },
      }),
      can(user.role, "reports:view")
        ? prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { actor: { select: { name: true } } } })
        : Promise.resolve([]),
      prisma.vehicle.findMany({
        where: { isPublished: true, status: { not: VehicleStatus.ARCHIVED } },
        orderBy: { viewCount: "desc" },
        take: 5,
        select: { id: true, year: true, make: true, model: true, trim: true, viewCount: true, _count: { select: { enquiries: true } } },
      }),
      prisma.vehicleEnquiry.count({ where: { ...leadScope, createdAt: { gte: since30 } } }),
    ]);

  const count = (s: VehicleStatus) => statusCounts.find((c) => c.status === s)?._count._all ?? 0;
  const totalVehicles = statusCounts.filter((c) => c.status !== VehicleStatus.ARCHIVED).reduce((n, c) => n + c._count._all, 0);
  const maxViews = Math.max(1, ...topViewed.map((v) => v.viewCount));

  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(" ")[0]}`} description={formatInZone(new Date(), tz, settings.locale, { dateStyle: "full" })} />
      {searchParams.denied ? (
        <p role="alert" className="mb-6 border border-[#E6C2BA] bg-[#F6E3DF] px-4 py-3 text-sm text-[#7A2A1E]">
          You don't have access to that page.
        </p>
      ) : null}

      <div className="mb-8 grid gap-px border border-ivory-line bg-ivory-line sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total vehicles" value={totalVehicles} note="Excluding archived" href="/admin/vehicles" />
        <StatTile label="Available" value={count(VehicleStatus.AVAILABLE)} href="/admin/vehicles?status=AVAILABLE" />
        <StatTile label="Reserved" value={count(VehicleStatus.RESERVED)} href="/admin/vehicles?status=RESERVED" />
        <StatTile label="Sold" value={count(VehicleStatus.SOLD)} href="/admin/vehicles?status=SOLD" />
        <StatTile label={allLeads ? "Total enquiries" : "My enquiries"} value={totalEnquiries} note={`${enquiries30} in the last 30 days`} href="/admin/enquiries" />
        <StatTile label="New enquiries" value={newEnquiries} note="Not yet contacted" href="/admin/enquiries?status=NEW" />
        <StatTile label="Pending test drives" value={pending} note="Awaiting approval" href="/admin/appointments?status=PENDING" />
        <StatTile label="Confirmed appointments" value={confirmed} note="Upcoming" href="/admin/appointments" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card title="Recent enquiries" actions={<Link href="/admin/enquiries" className="text-xs font-bold uppercase tracking-[0.1em] text-deepgold">View all</Link>} padded={false}>
          {recentEnquiries.length === 0 ? (
            <EmptyState title="No enquiries yet" body="New leads from the website will appear here." />
          ) : (
            <ul>
              {recentEnquiries.map((e) => (
                <li key={e.id} className="border-b border-ivory-soft last:border-0">
                  <Link href={`/admin/enquiries/${e.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-ivory">
                    <span className="flex min-w-0 flex-col">
                      <span className="font-semibold">{e.customer.fullName}</span>
                      <span className="truncate text-xs text-ink-muted">
                        {ENQUIRY_TYPE_LABELS[e.type]}
                        {e.vehicle ? ` · ${vehicleTitle(e.vehicle)}` : ""}
                        {e.assignments[0] ? ` · ${e.assignments[0].user.name}` : " · Unassigned"}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <Badge tone={enquiryStatusTone[e.status]}>{ENQUIRY_STATUS_LABELS[e.status]}</Badge>
                      <span className="text-xs text-ink-muted">{formatInZone(e.createdAt, tz, settings.locale, { dateStyle: "short", timeStyle: "short" })}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Upcoming test drives" actions={<Link href="/admin/appointments?view=calendar" className="text-xs font-bold uppercase tracking-[0.1em] text-deepgold">Calendar</Link>} padded={false}>
          {upcoming.length === 0 ? (
            <EmptyState title="Nothing scheduled" />
          ) : (
            <ul>
              {upcoming.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 border-b border-ivory-soft px-5 py-3.5 last:border-0">
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold">
                      {a.customer.fullName} · {a.scheduledAt ? formatInZone(a.scheduledAt, tz, settings.locale, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : a.preferredTime}
                    </span>
                    <span className="truncate text-xs text-ink-muted">{vehicleTitle(a.vehicle)}</span>
                  </span>
                  <Badge tone={a.status === AppointmentStatus.PENDING ? "amber" : "dark"}>{APPOINTMENT_STATUS_LABELS[a.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Inventory performance · most viewed">
          {topViewed.length === 0 ? (
            <EmptyState title="No published vehicles" />
          ) : (
            <ul className="flex flex-col gap-4">
              {topViewed.map((v) => (
                <li key={v.id} className="flex flex-col gap-1.5">
                  <div className="flex justify-between gap-3 text-sm">
                    <Link href={`/admin/vehicles/${v.id}`} className="font-semibold hover:text-deepgold">
                      {vehicleTitle(v)}
                    </Link>
                    <span className="whitespace-nowrap text-ink-muted">
                      {v.viewCount} views · {v._count.enquiries} enq.
                    </span>
                  </div>
                  <div className="h-1.5 bg-ivory-soft">
                    <div className="h-1.5 bg-obsidian" style={{ width: `${Math.round((v.viewCount / maxViews) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {activity.length > 0 ? (
          <Card title="Recent activity" padded={false}>
            <ul>
              {activity.map((a) => (
                <li key={a.id} className="flex items-baseline justify-between gap-3 border-b border-ivory-soft px-5 py-3 text-sm last:border-0">
                  <span>
                    <strong>{a.actor?.name ?? "Website"}</strong> <span className="text-ink-body">{a.summary ?? a.action}</span>
                  </span>
                  <span className="whitespace-nowrap text-xs text-ink-muted">{formatInZone(a.createdAt, tz, settings.locale, { dateStyle: "short", timeStyle: "short" })}</span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </>
  );
}
