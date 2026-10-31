import Link from "next/link";
import { PaymentStatus, Prisma } from "@prisma/client";
import { AdminPagination, Badge, Card, EmptyState, PageHeader, StatTile, TableWrap, Td, Th, adminButton, adminInput, type BadgeTone } from "@/components/admin/ui";
import { requirePage } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { isPaystackConfigured, isPaystackTestMode } from "@/lib/paystack";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { formatInZone } from "@/lib/time";
import { formatPrice } from "@/lib/utils";
import { vehicleTitle } from "@/lib/vehicles/format";
import { PaymentActions } from "./payment-actions";

export const metadata = { title: "Payments" };
const PER_PAGE = 30;

const tone: Record<PaymentStatus, BadgeTone> = {
  PENDING: "amber",
  SUCCESS: "green",
  FAILED: "red",
  ABANDONED: "muted",
  REFUNDED: "blue",
  NEEDS_REFUND: "red",
};
const label: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  SUCCESS: "Paid",
  FAILED: "Failed",
  ABANDONED: "Abandoned",
  REFUNDED: "Refunded",
  NEEDS_REFUND: "Needs refund",
};

export default async function PaymentsPage({ searchParams }: { searchParams: { status?: string; ref?: string; page?: string } }) {
  const user = await requirePage("payments:read");
  const settings = await getSiteSettings();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const status = Object.values(PaymentStatus).find((s) => s === searchParams.status);
  const ref = searchParams.ref?.trim().slice(0, 40);
  const where: Prisma.PaymentWhereInput = {
    ...(status ? { status } : {}),
    ...(ref
      ? { OR: [{ reference: { contains: ref, mode: "insensitive" } }, { email: { contains: ref, mode: "insensitive" } }, { customer: { fullName: { contains: ref, mode: "insensitive" } } }] }
      : {}),
  };
  const since30 = new Date(Date.now() - 30 * 86_400_000);
  const [total, payments, paid30, needsRefund] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        customer: { select: { id: true, fullName: true, phone: true } },
        vehicle: { select: { id: true, year: true, make: true, model: true, trim: true, stockNumber: true, status: true } },
        enquiry: { select: { id: true, reference: true } },
      },
    }),
    prisma.payment.aggregate({ where: { status: PaymentStatus.SUCCESS, paidAt: { gte: since30 } }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.payment.count({ where: { status: PaymentStatus.NEEDS_REFUND } }),
  ]);
  const naira = (n: unknown) => formatPrice(Number(n ?? 0), "NGN", "en-NG");
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const canRefund = can(user.role, "payments:manage");

  return (
    <>
      <PageHeader
        title="Payments"
        description="Online reservation deposits via Paystack"
        actions={can(user.role, "settings:write") ? <Link href="/admin/settings#payments" className={adminButton.outline}>Deposit settings</Link> : undefined}
      />

      {!isPaystackConfigured() ? (
        <p className="mb-6 border border-[#E2CFA9] bg-[#F3E9D6] px-4 py-3 text-sm text-[#5C431B]">
          Paystack isn't configured. Add PAYSTACK_SECRET_KEY to your environment, then turn on deposits in Settings.
        </p>
      ) : isPaystackTestMode() ? (
        <p className="mb-6 border border-[#C8D4E4] bg-[#E6ECF4] px-4 py-3 text-sm text-[#1F3557]">
          Paystack is in <strong>test mode</strong> — payments here are not real money. Switch to live keys before launch.
        </p>
      ) : null}

      <div className="mb-6 grid gap-px border border-ivory-line bg-ivory-line sm:grid-cols-3">
        <StatTile label="Deposits · last 30 days" value={naira(paid30._sum.amount)} note={`${paid30._count._all} payments`} />
        <StatTile label="Needs refund" value={needsRefund} note="Paid after the vehicle was taken" href="/admin/payments?status=NEEDS_REFUND" />
        <StatTile label="Deposit setting" value={settings.reservationDepositEnabled ? naira(settings.reservationDepositAmount) : "Off"} note={settings.reservationDepositEnabled ? `${settings.reservationHoldDays}-day hold` : "Turn on in Settings"} />
      </div>

      <form method="get" className="mb-5 flex flex-wrap gap-2.5" role="search">
        <label className="sr-only" htmlFor="pref">Search payments</label>
        <input id="pref" name="ref" defaultValue={ref} placeholder="Reference, email or name" className={`${adminInput} w-72`} />
        <select name="status" defaultValue={status ?? ""} aria-label="Status" className={adminInput}>
          <option value="">All statuses</option>
          {Object.values(PaymentStatus).map((s) => <option key={s} value={s}>{label[s]}</option>)}
        </select>
        <button type="submit" className={adminButton.dark}>Filter</button>
      </form>

      <Card padded={false}>
        {payments.length === 0 ? (
          <EmptyState title="No payments yet" body="Deposits paid on vehicle pages appear here." />
        ) : (
          <TableWrap>
            <thead>
              <tr><Th>Reference</Th><Th>Customer</Th><Th>Vehicle</Th><Th>Amount</Th><Th>Status</Th><Th>Date</Th><Th className="text-right">Actions</Th></tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className={ref && p.reference === ref ? "bg-ivory" : "hover:bg-ivory/60"}>
                  <Td>
                    <span className="font-mono text-xs">{p.reference}</span>
                    {p.enquiry ? <Link href={`/admin/enquiries/${p.enquiry.id}`} className="block text-xs text-deepgold underline">{p.enquiry.reference}</Link> : null}
                  </Td>
                  <Td>
                    <Link href={`/admin/customers/${p.customer.id}`} className="font-semibold hover:text-deepgold">{p.customer.fullName}</Link>
                    <span className="block text-xs text-ink-muted">{p.email}{p.customer.phone ? ` · ${p.customer.phone}` : ""}</span>
                  </Td>
                  <Td>
                    <Link href={`/admin/vehicles/${p.vehicle.id}`} className="hover:text-deepgold">{vehicleTitle(p.vehicle)}</Link>
                    <span className="block text-xs text-ink-muted">{p.vehicle.stockNumber} · {p.vehicle.status.toLowerCase()}</span>
                  </Td>
                  <Td className="font-semibold">{naira(p.amount)}{p.channel ? <span className="block text-xs font-normal text-ink-muted">{p.channel}</span> : null}</Td>
                  <Td>
                    <Badge tone={tone[p.status]}>{label[p.status]}</Badge>
                    {p.notes ? <span className="mt-1 block max-w-[220px] text-xs text-ink-muted">{p.notes}</span> : null}
                  </Td>
                  <Td className="whitespace-nowrap text-ink-muted">{formatInZone(p.paidAt ?? p.createdAt, settings.timezone, settings.locale, { dateStyle: "short", timeStyle: "short" })}</Td>
                  <Td className="text-right">
                    <PaymentActions id={p.id} reference={p.reference} status={p.status} canRefund={canRefund} vehicleReserved={p.vehicle.status === "RESERVED"} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
        <AdminPagination page={page} pageCount={pageCount} href={(n) => `/admin/payments?${new URLSearchParams({ ...(status ? { status } : {}), ...(ref ? { ref } : {}), page: String(n) })}`} />
      </Card>
    </>
  );
}
