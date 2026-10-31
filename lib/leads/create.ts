import "server-only";
import { randomBytes } from "node:crypto";
import { EnquiryType, Prisma, VehicleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logActivity, notifyStaff } from "@/lib/activity";
import { adminRecipient, sendEmail } from "@/lib/email/send";
import { customerAcknowledgement, staffNewLead } from "@/lib/email/templates";
import { getSiteSettings, type PublicSettings } from "@/lib/settings";
import { absoluteUrl } from "@/lib/utils";
import { ENQUIRY_TYPE_LABELS } from "./labels";

const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Human-friendly reference, e.g. BA-2611-7KQ3P. */
export function generateReference(now = new Date()): string {
  const yymm = `${String(now.getUTCFullYear()).slice(2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const bytes = randomBytes(5);
  const suffix = Array.from(bytes, (b) => REF_ALPHABET[b % REF_ALPHABET.length]).join("");
  return `BA-${yymm}-${suffix}`;
}

export function brandFromSettings(s: PublicSettings) {
  return {
    businessName: s.businessName,
    phone: s.phone,
    email: s.email,
    address: [s.addressLine, s.city, s.country].filter(Boolean).join(", ") || null,
  };
}

export interface LeadContact {
  fullName: string;
  email: string;
  phone?: string;
}

export interface CreateLeadInput {
  type: EnquiryType;
  contact: LeadContact;
  vehicleId?: string;
  message?: string;
  preferredContact?: string;
  source?: string;
  /** Creates the 1:1 detail row inside the same transaction. */
  detail?: (tx: Prisma.TransactionClient, enquiryId: string, customerId: string) => Promise<void>;
  /** Extra rows for the staff email. */
  emailDetails?: Array<[string, string | null | undefined]>;
  /** Skip the generic acknowledgement (e.g. test drives send their own). */
  skipCustomerEmail?: boolean;
}

export interface CreatedLead {
  enquiryId: string;
  reference: string;
  customerId: string;
  vehicleTitle: string | null;
  vehicleUrl: string | null;
}

export class LeadError extends Error {}

/**
 * Creates customer (upsert by email) + enquiry + detail in one transaction,
 * then notifies staff and emails both sides. Notification/email failures
 * never undo the saved lead.
 */
export async function createLead(input: CreateLeadInput): Promise<CreatedLead> {
  const vehicle = input.vehicleId
    ? await prisma.vehicle.findFirst({
        where: { id: input.vehicleId, isPublished: true, status: { not: VehicleStatus.ARCHIVED } },
        select: { id: true, slug: true, year: true, make: true, model: true, trim: true, stockNumber: true },
      })
    : null;
  if (input.vehicleId && !vehicle) throw new LeadError("That vehicle is no longer available.");

  let created: { enquiryId: string; reference: string; customerId: string } | null = null;
  for (let attempt = 0; attempt < 3 && !created; attempt += 1) {
    try {
      created = await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.upsert({
          where: { email: input.contact.email },
          update: { fullName: input.contact.fullName, ...(input.contact.phone ? { phone: input.contact.phone } : {}) },
          create: { email: input.contact.email, fullName: input.contact.fullName, phone: input.contact.phone },
        });
        const reference = generateReference();
        const enquiry = await tx.vehicleEnquiry.create({
          data: {
            reference,
            type: input.type,
            customerId: customer.id,
            vehicleId: vehicle?.id,
            message: input.message,
            preferredContact: input.preferredContact,
            source: input.source,
          },
        });
        if (input.detail) await input.detail(tx, enquiry.id, customer.id);
        await logActivity(
          { action: "enquiry.created", entityType: "VehicleEnquiry", entityId: enquiry.id, summary: `${ENQUIRY_TYPE_LABELS[input.type]} from ${customer.fullName}` },
          tx,
        );
        return { enquiryId: enquiry.id, reference, customerId: customer.id };
      });
    } catch (error) {
      // Retry only on a reference collision.
      const isRefCollision =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        String(error.meta?.target ?? "").includes("reference");
      if (!isRefCollision) throw error;
    }
  }
  if (!created) throw new Error("Could not allocate an enquiry reference.");

  const vehicleTitle = vehicle ? [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ") : null;
  const vehicleUrl = vehicle ? absoluteUrl(`/inventory/${vehicle.slug}`) : null;
  const typeLabel = ENQUIRY_TYPE_LABELS[input.type];
  const adminUrl = absoluteUrl(`/admin/enquiries/${created.enquiryId}`);

  // Side effects: best-effort, never fail the request.
  try {
    await notifyStaff({
      type: "lead.new",
      title: `New ${typeLabel.toLowerCase()} — ${input.contact.fullName}`,
      body: vehicleTitle ?? undefined,
      link: `/admin/enquiries/${created.enquiryId}`,
    });
  } catch (error) {
    console.error("[leads] notification failed", error);
  }

  const settings = await getSiteSettings();
  const brand = brandFromSettings(settings);
  const staffTo = adminRecipient(settings.email);
  const jobs: Array<Promise<unknown>> = [];
  if (staffTo) {
    const mail = staffNewLead(brand, {
      reference: created.reference,
      typeLabel,
      customerName: input.contact.fullName,
      customerEmail: input.contact.email,
      customerPhone: input.contact.phone ?? null,
      vehicleTitle: vehicleTitle ? `${vehicleTitle} (${vehicle?.stockNumber})` : null,
      details: input.emailDetails ?? [],
      message: input.message,
      adminUrl,
    });
    jobs.push(sendEmail({ to: staffTo, replyTo: input.contact.email, ...mail }));
  }
  if (!input.skipCustomerEmail) {
    const mail = customerAcknowledgement(brand, {
      name: input.contact.fullName,
      reference: created.reference,
      typeLabel,
      vehicleTitle,
      vehicleUrl,
    });
    jobs.push(sendEmail({ to: input.contact.email, replyTo: settings.email ?? undefined, ...mail }));
  }
  await Promise.allSettled(jobs);

  return { ...created, vehicleTitle, vehicleUrl };
}
