import Link from "next/link";
import type { StaffUser } from "@/lib/auth/guards";
import { can, ROLE_LABELS, type Permission } from "@/lib/auth/permissions";
import { AdminNav } from "./nav";
import { SignOutButton } from "./sign-out-button";

export interface NavItem {
  href: string;
  label: string;
  permission: Permission;
  badge?: number;
}

export function AdminShell({
  user,
  counts,
  children,
}: {
  user: StaffUser;
  counts: { newEnquiries: number; pendingAppointments: number; unreadNotifications: number; newMessages: number; paymentsNeedingAction: number };
  children: React.ReactNode;
}) {
  const items: NavItem[] = [
    { href: "/admin", label: "Dashboard", permission: "dashboard:view" },
    { href: "/admin/vehicles", label: "Vehicles", permission: "vehicles:read" },
    { href: "/admin/enquiries", label: "Enquiries", permission: "enquiries:write", badge: counts.newEnquiries },
    { href: "/admin/appointments", label: "Appointments", permission: "appointments:manage", badge: counts.pendingAppointments },
    { href: "/admin/customers", label: "Customers", permission: "customers:read" },
    { href: "/admin/messages", label: "Messages", permission: "messages:read", badge: counts.newMessages },
    { href: "/admin/payments", label: "Payments", permission: "payments:read", badge: counts.paymentsNeedingAction },
    { href: "/admin/content", label: "Content", permission: "content:write" },
    { href: "/admin/reports", label: "Reports", permission: "reports:view" },
    { href: "/admin/users", label: "Users & roles", permission: "users:manage" },
    { href: "/admin/settings", label: "Settings", permission: "settings:write" },
  ];
  const visible = items.filter((i) => can(user.role, i.permission));

  return (
    <div className="flex min-h-screen flex-col bg-ivory lg:flex-row">
      <aside className="flex shrink-0 flex-col bg-obsidian text-mist lg:sticky lg:top-0 lg:h-screen lg:w-[248px]">
        <div className="flex items-center justify-between px-6 py-6">
          <Link href="/admin" className="flex flex-col gap-0.5">
            <span className="font-display text-xl tracking-[0.18em] text-white">BALINGER</span>
            <span className="text-[9px] font-bold tracking-[0.5em] text-champagne">AUTOS · ADMIN</span>
          </Link>
          <Link href="/" target="_blank" className="text-xs text-mist-dim hover:text-champagne lg:hidden">
            View site
          </Link>
        </div>
        <AdminNav items={visible} />
        <div className="mt-auto hidden flex-col gap-3 border-t border-graphite-line px-6 py-5 lg:flex">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">{user.name}</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-champagne">{ROLE_LABELS[user.role]}</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/" target="_blank" className="hover:text-champagne">
              View site
            </Link>
            <SignOutButton />
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-4 border-b border-ivory-line bg-white px-5 py-3 text-sm lg:px-10">
          <Link href="/admin/notifications" className="inline-flex min-h-[40px] items-center gap-2 font-semibold hover:text-deepgold">
            Notifications
            {counts.unreadNotifications > 0 ? (
              <span className="bg-champagne px-1.5 text-[11px] font-bold text-obsidian">{counts.unreadNotifications}</span>
            ) : null}
          </Link>
          <Link href="/admin/account" className="inline-flex min-h-[40px] items-center font-semibold hover:text-deepgold">
            My account
          </Link>
          <span className="lg:hidden">
            <SignOutButton dark />
          </span>
        </header>
        <main className="flex-1 px-5 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
