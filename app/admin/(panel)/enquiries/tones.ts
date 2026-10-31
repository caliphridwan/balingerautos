import type { AppointmentStatus, EnquiryStatus } from "@prisma/client";
import type { BadgeTone } from "@/components/admin/ui";

export const enquiryStatusTone: Record<EnquiryStatus, BadgeTone> = {
  NEW: "dark",
  CONTACTED: "outline",
  FOLLOW_UP: "amber",
  QUALIFIED: "blue",
  CONVERTED: "green",
  CLOSED: "muted",
  CANCELLED: "muted",
};

export const appointmentStatusTone: Record<AppointmentStatus, BadgeTone> = {
  PENDING: "amber",
  CONFIRMED: "dark",
  RESCHEDULED: "blue",
  COMPLETED: "green",
  REJECTED: "red",
  CANCELLED: "muted",
  NO_SHOW: "red",
};
