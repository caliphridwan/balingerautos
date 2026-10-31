import { z } from "zod";

/**
 * Public lead-form schemas. Used by React Hook Form in the browser AND
 * re-run on the server in every action — client validation is a courtesy,
 * the server is the authority. No runtime Prisma imports (client-safe).
 */

export const TEST_DRIVE_TIMES = ["10:00", "11:00", "12:00", "14:00", "15:00", "16:00"] as const;
export const FINANCE_TERMS = ["12", "24", "36", "48", "60"] as const;
export const EMPLOYMENT_STATUSES = ["Employed", "Self-employed", "Business owner", "Retired", "Other"] as const;
export const TRADE_IN_CONDITIONS = ["Excellent", "Good", "Fair", "Needs work"] as const;
export const CONTACT_METHODS = ["email", "phone", "whatsapp"] as const;
export const SIMPLE_ENQUIRY_TYPES = ["VEHICLE", "GENERAL", "CALLBACK", "INSPECTION", "RESERVATION", "SOURCING"] as const;
export const CONTACT_FORM_CATEGORIES = ["GENERAL", "VEHICLE", "CALLBACK", "INSPECTION", "SOURCING", "FINANCING", "TRADE_IN"] as const;

const name = z.string().trim().min(2, "Please enter your full name.").max(100);
const email = z.string().trim().toLowerCase().email("Please enter a valid email address.").max(254);
const phoneRegex = /^\+?[\d\s()-]{7,20}$/;
const phoneRequired = z.string().trim().regex(phoneRegex, "Please enter a valid phone number.");
const phoneOptional = z
  .string()
  .trim()
  .max(20)
  .refine((v) => v === "" || phoneRegex.test(v), "Please enter a valid phone number.")
  .optional()
  .transform((v) => (v ? v : undefined));
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Please keep this under ${max} characters.`)
    .optional()
    .transform((v) => (v ? v : undefined));
const id = z.string().regex(/^[a-z0-9]{20,40}$/i, "Invalid reference.");
/** Treats "" (empty selects / hidden inputs) as "not provided". */
function optional<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());
}
/** Honeypot field: real visitors leave it empty. */
const honeypot = z.string().max(200).optional();

/** Empty string → undefined, otherwise a positive whole number. */
const optionalAmount = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(String(v).replace(/[^\d.]/g, ""))),
  z.number({ invalid_type_error: "Please enter a number." }).nonnegative().max(100_000_000_000).optional(),
);

const contact = {
  fullName: name,
  email,
  website: honeypot,
};

export const enquirySchema = z
  .object({
    ...contact,
    phone: phoneOptional,
    type: z.enum(SIMPLE_ENQUIRY_TYPES),
    vehicleId: optional(id),
    preferredContact: optional(z.enum(CONTACT_METHODS)),
    message: text(2000),
    sourcingMake: text(60),
    sourcingModel: text(60),
    sourcingBudget: text(60),
    source: text(40),
  })
  .superRefine((v, ctx) => {
    if ((v.type === "CALLBACK" || v.preferredContact === "phone" || v.preferredContact === "whatsapp") && !v.phone) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: "Please add a phone number so we can call you back." });
    }
    if (v.type === "SOURCING" && !v.sourcingMake && !v.message) {
      ctx.addIssue({ code: "custom", path: ["sourcingMake"], message: "Tell us which vehicle you'd like us to find." });
    }
    if ((v.type === "VEHICLE" || v.type === "RESERVATION") && !v.vehicleId) {
      ctx.addIssue({ code: "custom", path: ["vehicleId"], message: "Please choose a vehicle." });
    }
  });
export type EnquiryInput = z.input<typeof enquirySchema>;

export const testDriveSchema = z.object({
  ...contact,
  phone: phoneRequired,
  vehicleId: id,
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose a date."),
  preferredTime: z.enum(TEST_DRIVE_TIMES, { errorMap: () => ({ message: "Please choose a time." }) }),
  message: text(1000),
});
export type TestDriveInput = z.input<typeof testDriveSchema>;

export const financingSchema = z.object({
  ...contact,
  phone: phoneRequired,
  vehicleId: optional(id),
  vehiclePrice: optionalAmount,
  proposedDeposit: optionalAmount,
  termMonths: optional(z.enum(FINANCE_TERMS)),
  employmentStatus: optional(z.enum(EMPLOYMENT_STATUSES)),
  employerName: text(120),
  additionalDetails: text(2000),
});
export type FinancingInput = z.input<typeof financingSchema>;

export const tradeInSchema = z.object({
  ...contact,
  phone: phoneRequired,
  make: z.string().trim().min(2, "Please enter the make.").max(60),
  model: z.string().trim().min(1, "Please enter the model.").max(60),
  year: z.coerce
    .number({ invalid_type_error: "Please enter the year." })
    .int()
    .min(1950, "Please enter a valid year.")
    .max(new Date().getFullYear() + 1, "Please enter a valid year."),
  mileage: z.coerce.number({ invalid_type_error: "Please enter the mileage." }).int().min(0).max(2_000_000),
  condition: z.enum(TRADE_IN_CONDITIONS, { errorMap: () => ({ message: "Please choose a condition." }) }),
  expectedValue: optionalAmount,
  imagePublicIds: z.array(z.string().max(200)).max(8, "Up to 8 photos, please.").default([]),
  targetVehicleId: optional(id),
  message: text(2000),
});
export type TradeInInput = z.input<typeof tradeInSchema>;

export const contactMessageSchema = z.object({
  ...contact,
  phone: phoneOptional,
  category: z.enum(CONTACT_FORM_CATEGORIES),
  subject: text(120),
  message: z.string().trim().min(10, "Please write a short message (10+ characters).").max(3000),
});
export type ContactMessageInput = z.input<typeof contactMessageSchema>;

export const reservationPaymentSchema = z.object({
  ...contact,
  phone: phoneRequired,
  vehicleId: id,
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Please confirm you've read the reservation terms." }) }),
});
export type ReservationPaymentInput = z.input<typeof reservationPaymentSchema>;
