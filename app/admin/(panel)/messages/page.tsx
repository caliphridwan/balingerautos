import { ContactMessageStatus } from "@prisma/client";
import { AdminPagination, Badge, Card, EmptyState, PageHeader, adminButton } from "@/components/admin/ui";
import { requirePage } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { ENQUIRY_TYPE_LABELS } from "@/lib/leads/labels";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { formatInZone } from "@/lib/time";
import { cn } from "@/lib/utils";
import { MessageActions } from "./message-actions";

export const metadata = { title: "Messages" };
const PER_PAGE = 30;
const tone = { NEW: "dark", READ: "outline", REPLIED: "green", ARCHIVED: "muted" } as const;

export default async function MessagesPage({ searchParams }: { searchParams: { tab?: string; status?: string; open?: string; page?: string } }) {
  const user = await requirePage("messages:read");
  const settings = await getSiteSettings();
  const tab = searchParams.tab === "newsletter" ? "newsletter" : "messages";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const status = Object.values(ContactMessageStatus).find((s) => s === searchParams.status);

  const tabs = (
    <div className="flex border border-[#D4D1C8]">
      <a href="/admin/messages" className={cn("px-4 py-2.5 text-xs font-bold uppercase", tab === "messages" ? "bg-obsidian text-white" : "bg-white")}>Contact messages</a>
      <a href="/admin/messages?tab=newsletter" className={cn("border-l border-[#D4D1C8] px-4 py-2.5 text-xs font-bold uppercase", tab === "newsletter" ? "bg-obsidian text-white" : "bg-white")}>Newsletter</a>
    </div>
  );

  if (tab === "newsletter") {
    const [total, subs] = await Promise.all([
      prisma.newsletterSubscriber.count({ where: { isSubscribed: true } }),
      prisma.newsletterSubscriber.findMany({ where: { isSubscribed: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    ]);
    return (
      <>
        <PageHeader
          title="Newsletter subscribers"
          description={`${total} subscribed`}
          actions={
            <>
              {tabs}
              {can(user.role, "data:export") ? <a href="/api/admin/newsletter/export" className={adminButton.outline}>Export CSV</a> : null}
            </>
          }
        />
        <Card padded={false}>
          {subs.length === 0 ? (
            <EmptyState title="No subscribers yet" />
          ) : (
            <ul>
              {subs.map((s) => (
                <li key={s.id} className="flex justify-between gap-3 border-b border-ivory-soft px-5 py-3 text-sm last:border-0">
                  <span className="font-semibold">{s.email}</span>
                  <span className="text-ink-muted">{formatInZone(s.createdAt, settings.timezone, settings.locale, { dateStyle: "medium" })} · {s.source ?? "website"}</span>
                </li>
              ))}
            </ul>
          )}
          <AdminPagination page={page} pageCount={Math.max(1, Math.ceil(total / PER_PAGE))} href={(p) => `/admin/messages?tab=newsletter&page=${p}`} />
        </Card>
      </>
    );
  }

  const where = searchParams.open ? { id: searchParams.open } : status ? { status } : { status: { not: ContactMessageStatus.ARCHIVED } };
  const [total, messages] = await Promise.all([
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
  ]);

  return (
    <>
      <PageHeader title="Contact messages" description={`${total} ${status ? status.toLowerCase() : "open"}`} actions={tabs} />
      <form method="get" className="mb-5 flex gap-2.5">
        <select name="status" defaultValue={status ?? ""} aria-label="Status" className="h-10 rounded border border-[#D4D1C8] bg-white px-3 text-sm">
          <option value="">Open (not archived)</option>
          {Object.values(ContactMessageStatus).map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}
        </select>
        <button type="submit" className={adminButton.dark}>Filter</button>
      </form>
      {messages.length === 0 ? (
        <Card><EmptyState title="No messages" body="Messages from the contact page appear here." /></Card>
      ) : (
        <ul className="flex flex-col gap-4">
          {messages.map((m) => (
            <li key={m.id}>
              <Card>
                <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                  <div className="flex max-w-3xl flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={tone[m.status]}>{m.status.toLowerCase()}</Badge>
                      <span className="text-xs text-ink-muted">{ENQUIRY_TYPE_LABELS[m.category]} · {formatInZone(m.createdAt, settings.timezone, settings.locale, { dateStyle: "medium", timeStyle: "short" })}</span>
                    </div>
                    <p className="font-semibold">{m.subject ?? "(no subject)"}</p>
                    <p className="text-sm text-ink-muted">
                      {m.fullName} · <a href={`mailto:${m.email}`} className="underline">{m.email}</a>{m.phone ? ` · ${m.phone}` : ""}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{m.message}</p>
                  </div>
                  <MessageActions id={m.id} status={m.status} email={m.email} subject={m.subject} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4"><AdminPagination page={page} pageCount={Math.max(1, Math.ceil(total / PER_PAGE))} href={(p) => `/admin/messages?${new URLSearchParams({ ...(status ? { status } : {}), page: String(p) })}`} /></div>
    </>
  );
}
