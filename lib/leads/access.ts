import "server-only";
import type { Prisma } from "@prisma/client";
import type { StaffUser } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";

/** Enquiries a staff member may see: all for managers, otherwise those assigned to them. */
export function enquiryScope(user: StaffUser): Prisma.VehicleEnquiryWhereInput {
  return can(user.role, "enquiries:read_all") ? {} : { assignments: { some: { userId: user.id, isActive: true } } };
}

/** Appointments a staff member may see/manage. */
export function appointmentScope(user: StaffUser): Prisma.TestDriveBookingWhereInput {
  return can(user.role, "appointments:read_all") ? {} : { assignedToId: user.id };
}
