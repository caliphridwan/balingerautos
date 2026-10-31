import type { Metadata } from "next";
import { AppointmentStatus, ContactMessageStatus, EnquiryStatus, PaymentStatus } from "@prisma/client";
import { AdminShell } from "@/components/admin/shell";
import { requirePage } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin | Balinger Autos" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePage();
  const seeAllLeads = can(user.role, "enquiries:read_all");
  const seeAllAppts = can(user.role, "appointments:read_all");

  const [newEnquiries, pendingAppointments, unreadNotifications, newMessages, paymentsNeedingAction] = await Promise.all([
    prisma.vehicleEnquiry.count({
      where: { status: EnquiryStatus.NEW, ...(seeAllLeads ? {} : { assignments: { some: { userId: user.id, isActive: true } } }) },
    }),
    prisma.testDriveBooking.count({
      where: { status: AppointmentStatus.PENDING, ...(seeAllAppts ? {} : { assignedToId: user.id }) },
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    can(user.role, "messages:read") ? prisma.contactMessage.count({ where: { status: ContactMessageStatus.NEW } }) : Promise.resolve(0),
    can(user.role, "payments:read") ? prisma.payment.count({ where: { status: PaymentStatus.NEEDS_REFUND } }) : Promise.resolve(0),
  ]);

  return (
    <AdminShell user={user} counts={{ newEnquiries, pendingAppointments, unreadNotifications, newMessages, paymentsNeedingAction }}>
      {children}
    </AdminShell>
  );
}
