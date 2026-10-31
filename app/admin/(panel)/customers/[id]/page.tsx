import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/appointments";
import { requirePage } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { enquiryScope } from "@/lib/leads/access";
import { ENQUIRY_STATUS_LABELS, ENQUIRY_TYPE_LABELS } from "@/lib/leads/labels";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { formatInZone } from "@/lib/time";
import { vehicleTitle } from "@/lib/vehicles/format";
import { appointmentStatusTone, enquiryStatusTone } from "../../enquiries/tones";
import { CustomerForm } from "./customer-form";

export const metadata = { title: "Customer" };

export default async function CustomerPage({ params }: { params: { id: string } }) {
  const user = await requirePage("customers:read");
  const settings = await getSiteSettings();
  const tz = settings.timezone;
  const scope = enquiryScope(user);
  const customer = await prisma.customer.findFirst({
    where: { id: params.id, ...(can(user.role, "enquiries:read_all") ? {} : { enquiries: { some: scope } }) },
    include: {
      enquiries: {
        where: scope,
        orderBy: { createdAt: "desc" },
        include: {
          vehicle: { select: { year: true, make: true, model: true, trim: true } },
          communications: { orderBy: { createdAt: "desc" }, take: 3, include: { author: { select: { name: true } } } },
        },
      },
      testDrives: { orderBy: { preferredDate: "desc" }, include: { vehicle: { select: { year: true, make: true, model: true, trim: true } } } },
    },
  });
  if (!customer) notFound();
  const when = (d: Date) => formatInZone(d, tz, settings.locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <PageHeader title={customer.fullName} back={{ href: "/admin/customers", label: "Customers" }} description={`Customer since ${formatInZone(customer.createdAt, tz, settings.locale, { dateStyle: "long" })}`} />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <Card title="Details">
          {can(user.role, "customers:write") ? (
            <CustomerForm id={customer.id} fullName={customer.fullName} phone={customer.phone ?? ""} notes={customer.notes ?? ""} email={customer.email} />
          ) : (
            <dl className="flex flex-col gap-2 text-sm">
              <div><dt className="text-xs text-ink-muted">Email</dt><dd>{customer.email}</dd></div>
              <div><dt className="text-xs text-ink-muted">Phone</dt><dd>{customer.phone ?? "—"}</dd></div>
            </dl>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card title={`Enquiry history (${customer.enquiries.length})`} padded={false}>
            <ul>
              {customer.enquiries.map((e) => (
                <li key={e.id} className="border-b border-ivory-soft px-5 py-4 last:border-0">
                  <Link href={`/admin/enquiries/${e.id}`} className="flex flex-wrap items-center justify-between gap-2 hover:text-deepgold">
                    <span className="font-semibold">{ENQUIRY_TYPE_LABELS[e.type]}{e.vehicle ? ` · ${vehicleTitle(e.vehicle)}` : ""}</span>
                    <Badge tone={enquiryStatusTone[e.status]}>{ENQUIRY_STATUS_LABELS[e.status]}</Badge>
                  </Link>
                  <p className="text-xs text-ink-muted">{e.reference} · {when(e.createdAt)}</p>
                  {e.communications.length ? (
                    <ul className="mt-2 flex flex-col gap-1 border-l border-ivory-line pl-3 text-xs text-ink-body">
                      {e.communications.map((c) => (
                        <li key={c.id}>
                          <span className="font-semibold">{c.channel.toLowerCase().replace("_", " ")}</span> · {c.author?.name ?? "System"} · {when(c.createdAt)}: {c.body.slice(0, 160)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>

          <Card title={`Appointments (${customer.testDrives.length})`} padded={false}>
            {customer.testDrives.length === 0 ? (
              <p className="px-5 py-4 text-sm text-ink-muted">No test drives.</p>
            ) : (
              <ul>
                {customer.testDrives.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-ivory-soft px-5 py-3 text-sm last:border-0">
                    <Link href={`/admin/appointments?open=${t.id}`} className="hover:text-deepgold">
                      {vehicleTitle(t.vehicle)} · {t.scheduledAt ? when(t.scheduledAt) : t.preferredTime}
                    </Link>
                    <Badge tone={appointmentStatusTone[t.status]}>{APPOINTMENT_STATUS_LABELS[t.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
