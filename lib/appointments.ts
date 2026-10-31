import { AppointmentStatus } from "@prisma/client";

/** Bookable test-drive start times, showroom local time. */
export const TEST_DRIVE_SLOTS = ["10:00", "11:00", "12:00", "14:00", "15:00", "16:00"] as const;
export type TestDriveSlot = (typeof TEST_DRIVE_SLOTS)[number];

/** Days customers can book (0 = Sunday). */
export const TEST_DRIVE_DAYS = [1, 2, 3, 4, 5, 6];

export const BOOKING_WINDOW_DAYS = 60;
export const DEFAULT_DURATION_MINS = 45;

/** Statuses that occupy a vehicle (and staff member) at a time. */
export const BLOCKING_STATUSES: AppointmentStatus[] = [AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  RESCHEDULED: "Rescheduled",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};
