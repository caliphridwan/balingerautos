import Image from "next/image";
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
import { dateInZone, formatInZone } from "@/lib/time";
import { formatPrice } from "@/lib/utils";
import { vehicleTitle } from "@/lib/vehicles/format";
import { appointmentStatusTone, enquiryStatusTone } from "../tones";
import { AssignControl, CommunicationForm, FollowUpControl, StatusControl } from "./controls";

export const metadata = { title: "Enquiry" };

const CHANNEL_LABELS = { NOTE: "Internal note", PHONE: "Phone call", EMAIL: "Email", WHATSAPP: "WhatsApp", IN_PERSON: "In person" } as const;

export default async function EnquiryDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePage("enquiries:write");
  const settings = await getSiteSettings();
  const tz = settings.timezone;
  const enquiry = await prisma.vehicleEnquiry.findFirst({
    where: { id: params.id, ...enquiryScope(user) },
    include: {
      customer: { include: { _count: { select: { enquiries: true } } } },
      vehicle: { select: { id: true, slug: true, year: true, make: true, model: true, trim: true, stockNumber: true, price: true, currency: true, status: true } },
      testDrive: { include: { assignedTo: { select: { name: true } } } },
      financing: true,
      tradeIn: true,
      payments: { orderBy: { createdAt: "desc" } },
      assignments: { orderBy: { assignedAt: "desc" }, include: { user: { select: { id: true, name: true } } } },
      communications: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
    },
  });
  if (!enquiry) notFound();

  const staff = can(user.role, "enquiries:assign")
    ? await prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } })
    : [];
  const active = enquiry.assignments.find((a) => a.isActive);
  const money = (n: unknown, currency = settings.currency) => (n === null || n === undefined ? "—" : formatPrice(Number(n), currency, settings.locale));
  const when = (d: Date) => formatInZone(d, tz, settings.locale, { dateStyle: "medium", timeStyle: "short" });
  const whatsapp = enquiry.customer.phone ? `https://wa.me/${enquiry.customer.phone.replace(/\D/g, "")}` : null;

  return (
    <>
      <PageHeader
        title={`${ENQUIRY_TYPE_LABELS[enquiry.type]} · ${enquiry.customer.fullName}`}
        back={{ href: "/admin/enquiries", label: "Enquiries" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={enquiryStatusTone[enquiry.status]}>{ENQUIRY_STATUS_LABELS[enquiry.status]}</Badge>
            <span>
              {enquiry.reference} · received {when(enquiry.createdAt)}
              {enquiry.source ? ` · via ${enquiry.source.replace(/_/g, " ")}` : ""}
            </span>
          </span>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card title="Request">
            {enquiry.message ? <p className="whitespace-pre-line text-[15px] leading-relaxed">{enquiry.message}</p> : <p className="text-sm text-ink-muted">No message.</p>}
            {enquiry.preferredContact ? <p className="mt-3 text-sm text-ink-muted">Prefers contact by {enquiry.preferredContact}.</p> : null}

            {enquiry.testDrive ? (
              <div className="mt-5 border-t border-ivory-soft pt-4">
                <h3 className="mb-2 text-sm font-bold">Test drive</h3>
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge tone={appointmentStatusTone[enquiry.testDrive.status]}>{APPOINTMENT_STATUS_LABELS[enquiry.testDrive.status]}</Badge>
                  {enquiry.testDrive.scheduledAt ? when(enquiry.testDrive.scheduledAt) : `${dateInZone(enquiry.testDrive.preferredDate, "UTC")} ${enquiry.testDrive.preferredTime}`}
                  {enquiry.testDrive.assignedTo ? ` · with ${enquiry.testDrive.assignedTo.name}` : ""}
                </p>
                <Link href={`/admin/appointments?open=${enquiry.testDrive.id}`} className="mt-2 inline-block text-xs font-bold uppercase tracking-[0.08em] text-deepgold">
                  Manage appointment →
                </Link>
              </div>
            ) : null}

            {enquiry.financing ? (
              <div className="mt-5 border-t border-ivory-soft pt-4">
              <h3 className="mb-2 text-sm font-bold">Financing</h3>
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <div className="flex justify-between gap-3"><dt className="text-ink-muted">Vehicle price</dt><dd className="font-semibold">{money(enquiry.financing.vehiclePrice, enquiry.vehicle?.currency)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-ink-muted">Deposit</dt><dd className="font-semibold">{money(enquiry.financing.proposedDeposit, enquiry.vehicle?.currency)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-ink-muted">Term</dt><dd className="font-semibold">{enquiry.financing.termMonths ? `${enquiry.financing.termMonths} months` : "—"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-ink-muted">Employment</dt><dd className="font-semibold">{enquiry.financing.employmentStatus ?? "—"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-ink-muted">Employer</dt><dd className="font-semibold">{enquiry.financing.employerName ?? "—"}</dd></div>
              </dl>
              </div>
            ) : null}

            {enquiry.tradeIn ? (
              <div className="mt-5 border-t border-ivory-soft pt-4">
                <h3 className="mb-2 text-sm font-bold">Trade-in vehicle</h3>
                <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <div className="flex justify-between gap-3"><dt className="text-ink-muted">Vehicle</dt><dd className="font-semibold">{enquiry.tradeIn.year} {enquiry.tradeIn.make} {enquiry.tradeIn.model}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-ink-muted">Mileage</dt><dd className="font-semibold">{enquiry.tradeIn.mileage.toLocaleString()} {settings.mileageUnit}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-ink-muted">Condition</dt><dd className="font-semibold">{enquiry.tradeIn.condition}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-ink-muted">Expected value</dt><dd className="font-semibold">{money(enquiry.tradeIn.expectedValue)}</dd></div>
                </dl>
                {enquiry.tradeIn.imageUrls.length ? (
                  <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {enquiry.tradeIn.imageUrls.map((url, i) => (
                      <li key={url} className="relative aspect-[4/3] overflow-hidden bg-ivory-soft">
                        <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open trade-in photo ${i + 1}`}>
                          <Image src={url} alt={`Trade-in photo ${i + 1}`} fill sizes="200px" className="object-cover" />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </Card>

          {enquiry.payments.length ? (
            <Card title="Payments">
              <ul className="flex flex-col gap-2 text-sm">
                {enquiry.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/admin/payments?ref=${p.reference}`} className="font-mono text-xs underline">{p.reference}</Link>
                    <span className="font-semibold">{money(p.amount, p.currency)}</span>
                    <Badge tone={p.status === "SUCCESS" ? "green" : p.status === "NEEDS_REFUND" ? "red" : p.status === "REFUNDED" ? "blue" : "amber"}>{p.status.toLowerCase().replace("_", " ")}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card title="Communication history">
            <CommunicationForm enquiryId={enquiry.id} />
            <ol className="mt-6 flex flex-col">
              {enquiry.communications.map((c) => (
                <li key={c.id} className="border-t border-ivory-soft py-3.5">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                    <Badge tone={c.channel === "NOTE" ? "muted" : "blue"}>{CHANNEL_LABELS[c.channel]}</Badge>
                    <span>{c.author?.name ?? "System"}</span>
                    <span>· {when(c.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-line text-sm leading-relaxed">{c.body}</p>
                </li>
              ))}
              <li className="border-t border-ivory-soft py-3.5 text-xs text-ink-muted">Enquiry received {when(enquiry.createdAt)}</li>
            </ol>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Customer">
            <dl className="flex flex-col gap-2 text-sm">
              <div><dt className="text-xs text-ink-muted">Name</dt><dd className="font-semibold"><Link href={`/admin/customers/${enquiry.customer.id}`} className="hover:text-deepgold">{enquiry.customer.fullName}</Link></dd></div>
              <div><dt className="text-xs text-ink-muted">Email</dt><dd><a href={`mailto:${enquiry.customer.email}?subject=${encodeURIComponent(`Your enquiry ${enquiry.reference}`)}`} className="font-semibold underline">{enquiry.customer.email}</a></dd></div>
              {enquiry.customer.phone ? (
                <div><dt className="text-xs text-ink-muted">Phone</dt><dd className="flex gap-3 font-semibold"><a href={`tel:${enquiry.customer.phone}`} className="underline">{enquiry.customer.phone}</a>{whatsapp ? <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="text-deepgold underline">WhatsApp</a> : null}</dd></div>
              ) : null}
              <div><dt className="text-xs text-ink-muted">Enquiries</dt><dd>{enquiry.customer._count.enquiries}</dd></div>
            </dl>
          </Card>

          {enquiry.vehicle ? (
            <Card title="Vehicle">
              <p className="font-semibold">{vehicleTitle(enquiry.vehicle)}</p>
              <p className="text-sm text-ink-muted">Stock {enquiry.vehicle.stockNumber} · {money(enquiry.vehicle.price, enquiry.vehicle.currency)} · {enquiry.vehicle.status.toLowerCase()}</p>
              <div className="mt-3 flex gap-4 text-xs font-bold uppercase tracking-[0.08em]">
                <Link href={`/admin/vehicles/${enquiry.vehicle.id}`} className="text-deepgold">Admin</Link>
                <Link href={`/inventory/${enquiry.vehicle.slug}`} target="_blank" className="text-deepgold">Website</Link>
              </div>
            </Card>
          ) : null}

          <Card title="Manage">
            <div className="flex flex-col gap-5">
              <StatusControl enquiryId={enquiry.id} status={enquiry.status} />
              <FollowUpControl enquiryId={enquiry.id} value={enquiry.followUpAt ? dateInZone(enquiry.followUpAt, tz) : ""} />
              {staff.length ? (
                <AssignControl enquiryId={enquiry.id} staff={staff} current={active?.user.id ?? ""} />
              ) : (
                <p className="text-sm text-ink-muted">Assigned to {active?.user.name ?? "no one"}.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
