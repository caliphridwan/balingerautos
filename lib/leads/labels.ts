import { EnquiryStatus, EnquiryType } from "@prisma/client";

export const ENQUIRY_TYPE_LABELS: Record<EnquiryType, string> = {
  VEHICLE: "Vehicle enquiry",
  GENERAL: "General enquiry",
  CALLBACK: "Callback request",
  TEST_DRIVE: "Test drive",
  INSPECTION: "Inspection",
  SOURCING: "Vehicle sourcing",
  FINANCING: "Financing",
  TRADE_IN: "Trade-in",
  RESERVATION: "Reservation",
};

export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  FOLLOW_UP: "Follow-up",
  QUALIFIED: "Qualified",
  CONVERTED: "Converted",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

export const ENQUIRY_TYPES = Object.values(EnquiryType);
export const ENQUIRY_STATUSES = Object.values(EnquiryStatus);

/** Categories offered on the public contact form. */
export const CONTACT_CATEGORIES = [
  EnquiryType.GENERAL,
  EnquiryType.VEHICLE,
  EnquiryType.CALLBACK,
  EnquiryType.INSPECTION,
  EnquiryType.SOURCING,
  EnquiryType.FINANCING,
  EnquiryType.TRADE_IN,
] as const;
