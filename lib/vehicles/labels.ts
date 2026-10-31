import {
  BodyType,
  FuelType,
  TransmissionType,
  VehicleCondition,
  VehicleStatus,
} from "@prisma/client";

export const BODY_TYPE_LABELS: Record<BodyType, string> = {
  SUV: "SUV",
  SEDAN: "Sedan",
  COUPE: "Coupe",
  CONVERTIBLE: "Convertible",
  HATCHBACK: "Hatchback",
  WAGON: "Wagon",
  PICKUP: "Pickup",
  CROSSOVER: "Crossover",
  VAN: "Van",
};

export const FUEL_LABELS: Record<FuelType, string> = {
  PETROL: "Petrol",
  DIESEL: "Diesel",
  HYBRID: "Hybrid",
  PLUG_IN_HYBRID: "Plug-in hybrid",
  ELECTRIC: "Electric",
};

export const TRANSMISSION_LABELS: Record<TransmissionType, string> = {
  AUTOMATIC: "Automatic",
  MANUAL: "Manual",
  SEMI_AUTOMATIC: "Semi-automatic",
  CVT: "CVT",
};

export const CONDITION_LABELS: Record<VehicleCondition, string> = {
  NEW: "New",
  USED: "Pre-owned",
  CERTIFIED_PRE_OWNED: "Certified pre-owned",
};

export const STATUS_LABELS: Record<VehicleStatus, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  SOLD: "Sold",
  ARCHIVED: "Archived",
};

export const BODY_TYPES = Object.values(BodyType);
export const FUEL_TYPES = Object.values(FuelType);
export const TRANSMISSIONS = Object.values(TransmissionType);
export const CONDITIONS = Object.values(VehicleCondition);
/** Statuses customers may filter by. Archived stock is never public. */
export const PUBLIC_STATUSES = [VehicleStatus.AVAILABLE, VehicleStatus.RESERVED, VehicleStatus.SOLD] as const;
