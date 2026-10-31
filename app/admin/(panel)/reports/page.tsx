import Link from "next/link";
import { EnquiryStatus, PaymentStatus, VehicleStatus } from "@prisma/client";
import { Card, EmptyState, PageHeader, StatTile, adminButton } from "@/components/admin/ui";
import { requirePage } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { ENQUIRY_STATUS_LABELS, ENQUIRY_TYPE_LABELS } from "@/lib/leads/labels";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { formatPrice } from "@/lib/utils";
import { vehicleTitle } from "@/lib/vehicles/format";
import { BODY_TYPE_LABELS, STATUS_LABELS } from "@/lib/vehicles/labels";

export const metadata = { title: "Reports" };

const RANGES = { "30": 30, "90": 90, "365": 365 } as const;

function Bars({ rows }: { rows: Array<{ label: string; value: number; note?: string }> }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <EmptyState title="No data in this period" />;
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.label} className="flex flex-col gap-1">
          <div className="flex justify-between gap-3 text-sm">
            <span className="font-semibold">{r.label}</span>
            <span className="text-ink-muted">{r.note ?? r.value}</span>
          </div>
          <div className="h-1.5 bg-ivory-soft">
            <div className="h-1.5 bg-obsidian" style={{ width: `${Math.round((r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: { range?: string } }) {
  const user = await requirePage("reports:view");
  const settings = await getSiteSettings();
  const days = RANGES[(searchParams.range ?? "90") as keyof typeof RANGES] ?? 90;
  const since = new Date(Date.now() - days * 86_400_000);

  const [byType, byStatus, total, converted, searches, zeroResults, inventory, byBody, topViewed, sold, valueAvailable, deposits] = await Promise.all([
    prisma.vehicleEnquiry.groupBy({ by: ["type"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.vehicleEnquiry.groupBy({ by: ["status"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.vehicleEnquiry.count({ where: { createdAt: { gte: since } } }),
    prisma.vehicleEnquiry.count({ where: { createdAt: { gte: since }, status: EnquiryStatus.CONVERTED } }),
    prisma.searchEvent.findMany({ where: { createdAt: { gte: since } }, select: { query: true, filters: true, resultCount: true }, take: 20_000, orderBy: { createdAt: "desc" } }),
    prisma.searchEvent.count({ where: { createdAt: { gte: since }, resultCount: 0 } }),
    prisma.vehicle.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.vehicle.groupBy({ by: ["bodyType"], where: { status: { in: [VehicleStatus.AVAILABLE, VehicleStatus.RESERVED] } }, _count: { _all: true } }),
    prisma.vehicle.findMany({
      where: { status: { not: VehicleStatus.ARCHIVED } },
      orderBy: { viewCount: "desc" },
      take: 10,
      select: { id: true, year: true, make: true, model: true, trim: true, viewCount: true, _count: { select: { enquiries: true } } },
    }),
    prisma.vehicle.findMany({ where: { status: VehicleStatus.SOLD, soldAt: { gte: since } }, select: { createdAt: true, soldAt: true, price: true, currency: true } }),
    prisma.vehicle.aggregate({ where: { status: VehicleStatus.AVAILABLE, isPublished: true, currency: settings.currency }, _sum: { price: true } }),
    prisma.payment.aggregate({ where: { status: PaymentStatus.SUCCESS, paidAt: { gte: since } }, _sum: { amount: true }, _count: { _all: true } }),
  ]);

  // Search analytics: most-filtered makes and body types, top keywords.
  const makeCounts = new Map<string, number>();
  const bodyCounts = new Map<string, number>();
  const termCounts = new Map<string, number>();
  for (const s of searches) {
    const f = (s.filters ?? {}) as { make?: string[]; body?: string[] };
    for (const m of f.make ?? []) makeCounts.set(m, (makeCounts.get(m) ?? 0) + 1);
    for (const b of f.body ?? []) bodyCounts.set(b, (bodyCounts.get(b) ?? 0) + 1);
    if (s.query) {
      const term = s.query.toLowerCase().trim();
      termCounts.set(term, (termCounts.get(term) ?? 0) + 1);
    }
  }
  const top = (m: Map<string, number>, label = (k: string) => k) =>
    Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k, v]) => ({ label: label(k), value: v }));

  const avgDaysToSell = sold.length
    ? Math.round(sold.reduce((sum, v) => sum + ((v.soldAt?.getTime() ?? 0) - v.createdAt.getTime()) / 86_400_000, 0) / sold.length)
    : null;
  const conversion = total ? Math.round((converted / total) * 100) : 0;
  const inv = (s: VehicleStatus) => inventory.find((i) => i.status === s)?._count._all ?? 0;

  return (
    <>
      <PageHeader
        title="Reports"
        description={`Last ${days} days`}
        actions={
          <>
            {(["30", "90", "365"] as const).map((r) => (
              <Link key={r} href={`/admin/reports?range=${r}`} className={String(days) === r ? adminButton.dark : adminButton.outline}>
                {r === "365" ? "12 months" : `${r} days`}
              </Link>
            ))}
            {can(user.role, "data:export") ? (
              <>
                <a href="/api/admin/vehicles/export" className={adminButton.outline}>Inventory CSV</a>
                <a href="/api/admin/enquiries/export" className={adminButton.outline}>Enquiries CSV</a>
              </>
            ) : null}
          </>
        }
      />

      <div className="mb-8 grid gap-px border border-ivory-line bg-ivory-line sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Enquiries" value={total} note={`Last ${days} days`} />
        <StatTile label="Conversion rate" value={`${conversion}%`} note={`${converted} converted`} />
        <StatTile label="Vehicles sold" value={sold.length} note={avgDaysToSell !== null ? `Avg. ${avgDaysToSell} days to sell` : "In this period"} />
        <StatTile label="Online deposits" value={formatPrice(Number(deposits._sum.amount ?? 0), "NGN", "en-NG")} note={`${deposits._count._all} paid via Paystack`} href="/admin/payments" />
        <StatTile label="Available stock value" value={formatPrice(Number(valueAvailable._sum.price ?? 0), settings.currency, settings.locale)} note={`${inv(VehicleStatus.AVAILABLE)} available · ${settings.currency} listings only`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Enquiries by type">
          <Bars rows={byType.sort((a, b) => b._count._all - a._count._all).map((r) => ({ label: ENQUIRY_TYPE_LABELS[r.type], value: r._count._all }))} />
        </Card>
        <Card title="Enquiries by status">
          <Bars rows={byStatus.sort((a, b) => b._count._all - a._count._all).map((r) => ({ label: ENQUIRY_STATUS_LABELS[r.status], value: r._count._all }))} />
        </Card>
        <Card title="Inventory performance · most viewed">
          <Bars rows={topViewed.map((v) => ({ label: vehicleTitle(v), value: v.viewCount, note: `${v.viewCount} views · ${v._count.enquiries} enquiries` }))} />
        </Card>
        <Card title="Inventory mix (available & reserved)">
          <Bars rows={byBody.sort((a, b) => b._count._all - a._count._all).map((r) => ({ label: BODY_TYPE_LABELS[r.bodyType], value: r._count._all }))} />
          <p className="mt-4 text-xs text-ink-muted">
            {Object.values(VehicleStatus).map((s) => `${STATUS_LABELS[s]}: ${inv(s)}`).join(" · ")}
          </p>
        </Card>
        <Card title={`Search analytics · ${searches.length} filtered searches`}>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">Most filtered makes</h3>
              <Bars rows={top(makeCounts)} />
            </div>
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">Most filtered body types</h3>
              <Bars rows={top(bodyCounts, (k) => BODY_TYPE_LABELS[k as keyof typeof BODY_TYPE_LABELS] ?? k)} />
            </div>
          </div>
        </Card>
        <Card title="Search keywords">
          <Bars rows={top(termCounts)} />
          <p className="mt-4 text-sm text-ink-muted">
            <strong className="text-obsidian">{zeroResults}</strong> searches returned no vehicles — useful demand signals for sourcing.
          </p>
        </Card>
      </div>
    </>
  );
}
