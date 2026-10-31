import { z } from "zod";

/**
 * Admin vehicle schema, shared by the multi-step form (browser) and the
 * server actions. Enum values mirror prisma/schema.prisma; kept as plain
 * strings so this file has no runtime Prisma import.
 */

export const BODY_TYPE_VALUES = ["SUV", "SEDAN", "COUPE", "CONVERTIBLE", "HATCHBACK", "WAGON", "PICKUP", "CROSSOVER", "VAN"] as const;
export const CONDITION_VALUES = ["NEW", "USED", "CERTIFIED_PRE_OWNED"] as const;
export const STATUS_VALUES = ["AVAILABLE", "RESERVED", "SOLD", "ARCHIVED"] as const;
export const FUEL_VALUES = ["PETROL", "DIESEL", "HYBRID", "PLUG_IN_HYBRID", "ELECTRIC"] as const;
export const TRANSMISSION_VALUES = ["AUTOMATIC", "MANUAL", "SEMI_AUTOMATIC", "CVT"] as const;
export const DRIVETRAIN_VALUES = ["FWD", "RWD", "AWD", "FOUR_WD"] as const;
export const FEATURE_GROUP_VALUES = ["KEY", "SAFETY", "COMFORT", "TECHNOLOGY"] as const;

const blankToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);
const optText = (max: number) => z.preprocess(blankToUndef, z.string().trim().max(max).optional());
const optInt = (min: number, max: number) => z.preprocess(blankToUndef, z.coerce.number().int().min(min).max(max).optional());
const bool = z.preprocess((v) => v === true || v === "true" || v === "on" || v === "1" || v === "yes", z.boolean());

export const vehicleImageSchema = z.object({
  id: z.string().optional(), // existing VehicleImage id
  publicId: z.string().max(200).optional(), // new upload (verified server-side)
  url: z.string().url(),
  alt: optText(200),
});

export const vehicleFeatureSchema = z.object({
  group: z.enum(FEATURE_GROUP_VALUES),
  label: z.string().trim().min(1).max(120),
});

export const vehicleCoreSchema = z.object({
  stockNumber: z.string().trim().min(2, "Stock number is required.").max(30).regex(/^[A-Za-z0-9-_/]+$/, "Letters, numbers and - _ / only."),
  make: z.string().trim().min(1, "Make is required.").max(60),
  model: z.string().trim().min(1, "Model is required.").max(80),
  trim: optText(80),
  year: z.coerce.number({ invalid_type_error: "Year is required." }).int().min(1950).max(new Date().getFullYear() + 2),
  bodyType: z.enum(BODY_TYPE_VALUES),
  condition: z.enum(CONDITION_VALUES),
  status: z.enum(STATUS_VALUES),
  price: z.coerce.number({ invalid_type_error: "Price is required." }).nonnegative().max(100_000_000_000),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code."),
  priceOnRequest: bool,
  mileage: z.coerce.number({ invalid_type_error: "Mileage is required." }).int().min(0).max(2_000_000),
  transmission: z.enum(TRANSMISSION_VALUES),
  fuelType: z.enum(FUEL_VALUES),
  drivetrain: z.preprocess(blankToUndef, z.enum(DRIVETRAIN_VALUES).optional()),
  engineCapacityCc: optInt(0, 20_000),
  horsepower: optInt(0, 3_000),
  doors: optInt(1, 8),
  seats: optInt(1, 20),
  exteriorColour: z.string().trim().min(1, "Exterior colour is required.").max(40),
  interiorColour: optText(40),
  vin: z.preprocess(blankToUndef, z.string().trim().toUpperCase().regex(/^[A-HJ-NPR-Z0-9]{11,17}$/, "VIN must be 11–17 characters (no I, O or Q).").optional()),
  showVin: bool,
  description: optText(10_000),
  inspectionNotes: optText(5_000),
  inspectedAt: z.preprocess(blankToUndef, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  serviceHistory: optText(120),
  previousOwners: optInt(0, 50),
  videoUrl: z.preprocess(
    blankToUndef,
    z
      .string()
      .url("Enter a full https:// link.")
      .refine((u) => u.startsWith("https://"), "Use an https:// link.")
      .optional(),
  ),
  isFeatured: bool,
  isPublished: bool,
  metaTitle: optText(70),
  metaDescription: optText(170),
  slug: z.preprocess(blankToUndef, z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,120}$/, "Lowercase letters, numbers and dashes.").optional()),
});

export const vehicleSchema = vehicleCoreSchema.extend({
  categoryIds: z.array(z.string()).max(20).default([]),
  features: z.array(vehicleFeatureSchema).max(120).default([]),
  images: z.array(vehicleImageSchema).max(40, "Up to 40 photos per vehicle.").default([]),
});

export type VehicleFormInput = z.input<typeof vehicleSchema>;
export type VehicleFormValues = z.output<typeof vehicleSchema>;

/** Fields validated at each step of the admin form. */
export const VEHICLE_FORM_STEPS = [
  { id: "basics", label: "Basics", fields: ["stockNumber", "make", "model", "trim", "year", "bodyType", "condition", "categoryIds"] },
  { id: "pricing", label: "Price & status", fields: ["price", "currency", "priceOnRequest", "status", "isFeatured", "isPublished"] },
  {
    id: "specs",
    label: "Specification",
    fields: ["mileage", "transmission", "fuelType", "drivetrain", "engineCapacityCc", "horsepower", "doors", "seats", "exteriorColour", "interiorColour", "vin", "showVin"],
  },
  { id: "details", label: "Description & features", fields: ["description", "features", "inspectionNotes", "inspectedAt", "serviceHistory", "previousOwners"] },
  { id: "media", label: "Photos & video", fields: ["images", "videoUrl"] },
  { id: "seo", label: "SEO & review", fields: ["slug", "metaTitle", "metaDescription"] },
] as const;
