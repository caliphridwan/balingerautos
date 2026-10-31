import Link from "next/link";
import { AppointmentStatus, Prisma } from "@prisma/client";
import { Badge, Card, EmptyState, PageHeader, adminButton, adminInput } from "@/components/admin/ui";
import { APPOINTMENT_STATUS_LABELS, BLOCKING_STATUSES, TEST_DRIVE_SLOTS } from "@/lib/appointments";
import { requirePage } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { appointmentScope } from "@/lib/leads/access";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { addDays, dateInZone, formatInZone, startOfWeek, timeInZone, todayInZone, zonedToUtc } from "@/lib/time";
import { cn } from "@/lib/utils";
import { vehicleTitle } from "@/lib/vehicles/format";
import { appointmentStatusTone } from "../enquiries/tones";
import { AppointmentActions } from "./appointment-actions";

export const metadata = { title: "Appointments" };

type Search = { status?: string; view?: string; week?: string; open?: string; scope?: string };

export default async function AppointmentsPage({ searchParams }: { searchParams: Search }) {
  const user = await requirePage("appointments:manage");
  const settings = await getSiteSettings();
  const tz = settings.timezone;
  const view = searchParams.view === "calendar" ? "calendar" : "list";
  const status = Object.values(AppointmentStatus).find((s) => s === searchParams.status);
  const canAssign = can(user.role, "appointments:read_all");
  const staff = canAssign ? await prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : [];

  const include = {
    customer: { select: { id: true, fullName: true, email: true, phone: true } },
    vehicle: { select: { id: true, year: true, make: true, model: true, trim: true, stockNumber: true } },
    assignedTo: { select: { id: true, name: true } },
    enquiry: { select: { id: true, reference: true } },
  } satisfies Prisma.TestDriveBookingInclude;

  const viewToggle = (
    <div className="flex border border-[#D4D1C8]">
      <Link href="/admin/appointments" className={cn("px-4 py-2.5 text-xs font-bold uppercase", view === "list" ? "bg-obsidian text-white" : "bg-white")}>List</Link>
      <Link href="/admin/appointments?view=calendar" className={cn("border-l border-[#D4D1C8] px-4 py-2.5 text-xs font-bold uppercase", view === "calendar" ? "bg-obsidian text-white" : "bg-white")}>Calendar</Link>
    </div>
  );

  if (view === "calendar") {
    const week = searchParams.week && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.week) ? startOfWeek(searchParams.week) : startOfWeek(todayInZone(tz));
    const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
    const start = zonedToUtc(week, "00:00", tz);
    const end = zonedToUtc(addDays(week, 7), "00:00", tz);
    const bookings = await prisma.testDriveBooking.findMany({
      where: { ...appointmentScope(user), scheduledAt: { gte: start, lt: end }, status: { in: [...BLOCKING_STATUSES, AppointmentStatus.PENDING, AppointmentStatus.COMPLETED] } },
      orderBy: { scheduledAt: "asc" },
      include,
    });
    const hours = Array.from(new Set([...TEST_DRIVE_SLOTS, ...bookings.map((b) => (b.scheduledAt ? timeInZone(b.scheduledAt, tz) : ""))]))
      .filter(Boolean)
      .sort();
    const today = todayInZone(tz);

    return (
      <>
        <PageHeader title="Appointments" description={`Week of ${formatInZone(start, tz, settings.locale, { dateStyle: "long" })}`} actions={viewToggle} />
        <div className="mb-4 flex gap-2">
          <Link href={`/admin/appointments?view=calendar&week=${addDays(week, -7)}`} className={adminButton.outline}>← Previous</Link>
          <Link href="/admin/appointments?view=calendar" className={adminButton.outline}>This week</Link>
          <Link href={`/admin/appointments?view=calendar&week=${addDays(week, 7)}`} className={adminButton.outline}>Next →</Link>
        </div>
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] table-fixed border-collapse text-xs">
              <thead>
                <tr>
                  <th className="w-16 border-b border-ivory-soft p-2" />
                  {days.map((d) => (
                    <th key={d} scope="col" className={cn("border-b border-l border-ivory-soft p-2 text-left font-semibold", d === today && "bg-ivory")}>
                      {formatInZone(zonedToUtc(d, "12:00", tz), tz, settings.locale, { weekday: "short", day: "numeric", month: "short" })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hours.map((h) => (
                  <tr key={h}>
                    <th scope="row" className="border-b border-ivory-soft p-2 text-left font-mono text-ink-muted">{h}</th>
                    {days.map((d) => {
                      const items = bookings.filter((b) => b.scheduledAt && dateInZone(b.scheduledAt, tz) === d && timeInZone(b.scheduledAt, tz) === h);
                      return (
                        <td key={d} className={cn("h-16 border-b border-l border-ivory-soft p-1 align-top", d === today && "bg-ivory/60")}>
                          {items.map((b) => (
                            <Link
                              key={b.id}
                              href={`/admin/appointments?open=${b.id}`}
                              className={cn(
                                "mb-1 block border-l-2 bg-white px-1.5 py-1 leading-snug shadow-sm hover:bg-ivory",
                                b.status === AppointmentStatus.PENDING ? "border-[#C9A66B]" : b.status === AppointmentStatus.COMPLETED ? "border-[#1E4A2E]" : "border-obsidian",
                              )}
                            >
                              <span className="block font-semibold">{b.customer.fullName}</span>
                              <span className="block truncate text-ink-muted">{b.vehicle.make} {b.vehicle.model}</span>
                              <span className="block text-[10px] uppercase text-ink-muted">{APPOINTMENT_STATUS_LABELS[b.status]}{b.assignedTo ? ` · ${b.assignedTo.name.split(" ")[0]}` : ""}</span>
                            </Link>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <p className="mt-3 text-xs text-ink-muted">Times shown in {tz}. Pending requests are outlined in gold.</p>
      </>
    );
  }

  const where: Prisma.TestDriveBookingWhereInput = {
    ...appointmentScope(user),
    ...(searchParams.open ? { id: searchParams.open } : status ? { status } : { OR: [{ status: AppointmentStatus.PENDING }, { status: { in: BLOCKING_STATUSES }, scheduledAt: { gte: new Date(Date.now() - 86_400_000) } }] }),
  };
  const bookings = await prisma.testDriveBooking.findMany({
    where,
    orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    take: 100,
    include,
  });

  return (
    <>
      <PageHeader
        title="Appointments"
        description={searchParams.open ? "Showing one appointment" : status ? APPOINTMENT_STATUS_LABELS[status] : "Pending requests and upcoming confirmed test drives"}
        actions={viewToggle}
      />
      <form method="get" className="mb-5 flex flex-wrap gap-2.5">
        <select name="status" defaultValue={status ?? ""} aria-label="Status" className={adminInput}>
          <option value="">Pending &amp; upcoming</option>
          {Object.values(AppointmentStatus).map((s) => (
            <option key={s} value={s}>{APPOINTMENT_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <button type="submit" className={adminButton.dark}>Filter</button>
        {searchParams.open || status ? <Link href="/admin/appointments" className="h-10 px-2 text-xs font-bold uppercase leading-10 text-deepgold">Show all</Link> : null}
      </form>

      {bookings.length === 0 ? (
        <Card><EmptyState title="No appointments" body="Test-drive requests from vehicle pages appear here." /></Card>
      ) : (
        <ul className="flex flex-col gap-4">
          {bookings.map((b) => (
            <li key={b.id}>
              <Card>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={appointmentStatusTone[b.status]}>{APPOINTMENT_STATUS_LABELS[b.status]}</Badge>
                      <span className="text-lg font-semibold">
                        {b.scheduledAt ? formatInZone(b.scheduledAt, tz, settings.locale, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : `${dateInZone(b.preferredDate, "UTC")} ${b.preferredTime}`}
                      </span>
                    </div>
                    <p className="text-sm">
                      <Link href={`/admin/customers/${b.customer.id}`} className="font-semibold hover:text-deepgold">{b.customer.fullName}</Link>
                      <span className="text-ink-muted"> · {b.customer.email}{b.customer.phone ? ` · ${b.customer.phone}` : ""}</span>
                    </p>
                    <p className="text-sm text-ink-body">
                      <Link href={`/admin/vehicles/${b.vehicle.id}`} className="hover:text-deepgold">{vehicleTitle(b.vehicle)}</Link> · {b.vehicle.stockNumber}
                      {b.enquiry ? <> · <Link href={`/admin/enquiries/${b.enquiry.id}`} className="underline">{b.enquiry.reference}</Link></> : null}
                    </p>
                    {b.message ? <p className="max-w-2xl text-sm text-ink-muted">“{b.message}”</p> : null}
                    {b.outcome ? <p className="text-sm"><strong>Outcome:</strong> {b.outcome}</p> : null}
                  </div>
                  <AppointmentActions
                    id={b.id}
                    status={b.status}
                    assignedToId={b.assignedTo?.id ?? ""}
                    staff={staff}
                    slots={[...TEST_DRIVE_SLOTS]}
                    defaultDate={b.scheduledAt ? dateInZone(b.scheduledAt, tz) : dateInZone(b.preferredDate, "UTC")}
                    defaultTime={b.scheduledAt ? timeInZone(b.scheduledAt, tz) : b.preferredTime}
                  />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
