import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { AdminPagination, Card, EmptyState, PageHeader, TableWrap, Td, Th, adminButton, adminInput } from "@/components/admin/ui";
import { requirePage } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { enquiryScope } from "@/lib/leads/access";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { formatInZone } from "@/lib/time";

export const metadata = { title: "Customers" };
const PER_PAGE = 30;

export default async function CustomersPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const user = await requirePage("customers:read");
  const settings = await getSiteSettings();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const q = searchParams.q?.trim().slice(0, 80);
  const scoped = !can(user.role, "enquiries:read_all");

  const where: Prisma.CustomerWhereInput = {
    ...(scoped ? { enquiries: { some: enquiryScope(user) } } : {}),
    ...(q
      ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] }
      : {}),
  };
  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        _count: { select: { enquiries: true, testDrives: true } },
        enquiries: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <PageHeader
        title="Customers"
        description={`${total} ${total === 1 ? "customer" : "customers"}${scoped ? " on your enquiries" : ""}`}
        actions={can(user.role, "data:export") ? <a href="/api/admin/customers/export" className={adminButton.outline}>Export CSV</a> : undefined}
      />
      <form method="get" role="search" className="mb-5 flex gap-2.5">
        <label className="sr-only" htmlFor="cq">Search customers</label>
        <input id="cq" name="q" defaultValue={q} placeholder="Name, email or phone" className={`${adminInput} w-80`} />
        <button type="submit" className={adminButton.dark}>Search</button>
      </form>
      <Card padded={false}>
        {customers.length === 0 ? (
          <EmptyState title="No customers yet" body="Customers are created automatically from website enquiries." />
        ) : (
          <TableWrap>
            <thead>
              <tr><Th>Name</Th><Th>Email</Th><Th>Phone</Th><Th>Enquiries</Th><Th>Test drives</Th><Th>Last enquiry</Th></tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-ivory/60">
                  <Td><Link href={`/admin/customers/${c.id}`} className="font-semibold hover:text-deepgold">{c.fullName}</Link></Td>
                  <Td>{c.email}</Td>
                  <Td>{c.phone ?? "—"}</Td>
                  <Td>{c._count.enquiries}</Td>
                  <Td>{c._count.testDrives}</Td>
                  <Td className="text-ink-muted">{c.enquiries[0] ? formatInZone(c.enquiries[0].createdAt, settings.timezone, settings.locale, { dateStyle: "medium" }) : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
        <AdminPagination page={page} pageCount={pageCount} href={(p) => `/admin/customers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`} />
      </Card>
    </>
  );
}
