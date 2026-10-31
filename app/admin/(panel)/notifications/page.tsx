import Link from "next/link";
import { markNotificationsRead } from "@/app/admin/actions/users";
import { ActionButton } from "@/components/admin/action-button";
import { Card, EmptyState, PageHeader } from "@/components/admin/ui";
import { requirePage } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { formatInZone } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requirePage();
  const settings = await getSiteSettings();
  const notifications = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  const unread = notifications.filter((n) => !n.readAt).length;

  async function markAll() {
    "use server";
    return markNotificationsRead();
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        description={`${unread} unread`}
        actions={unread > 0 ? <ActionButton action={markAll} variant="outline">Mark all as read</ActionButton> : undefined}
      />
      <Card padded={false}>
        {notifications.length === 0 ? (
          <EmptyState title="You're all caught up" />
        ) : (
          <ul>
            {notifications.map((n) => (
              <li key={n.id} className={cn("border-b border-ivory-soft last:border-0", !n.readAt && "bg-ivory/70")}>
                <Link href={n.link ?? "/admin"} className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-ivory">
                  <span className="flex gap-3">
                    <span aria-hidden="true" className={cn("mt-1.5 h-2 w-2 shrink-0", n.readAt ? "bg-transparent" : "bg-champagne")} />
                    <span className="flex flex-col">
                      <span className={cn("text-sm", !n.readAt && "font-semibold")}>{n.title}</span>
                      {n.body ? <span className="text-xs text-ink-muted">{n.body}</span> : null}
                    </span>
                  </span>
                  <span className="whitespace-nowrap text-xs text-ink-muted">{formatInZone(n.createdAt, settings.timezone, settings.locale, { dateStyle: "short", timeStyle: "short" })}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
