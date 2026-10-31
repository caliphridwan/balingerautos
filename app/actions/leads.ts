"use server";

import { EnquiryType, Prisma } from "@prisma/client";
import { fail, fromZodError, unexpected, type ActionResult } from "@/lib/actions";
import { logActivity, notifyStaff } from "@/lib/activity";
import { createUploadSignature, isCloudinaryConfigured, verifyAsset, type UploadSignature } from "@/lib/cloudinary";
import { adminRecipient, sendEmail } from "@/lib/email/send";
import { appointmentUpdate, staffContactMessage } from "@/lib/email/templates";
import { brandFromSettings, createLead, LeadError } from "@/lib/leads/create";
import { ENQUIRY_TYPE_LABELS } from "@/lib/leads/labels";
import { availableSlots, checkRequestedSlot, findConflict } from "@/lib/leads/scheduling";
import { PaymentError, startDepositPayment } from "@/lib/payments/service";
import { isPaystackConfigured } from "@/lib/paystack";
import { prisma } from "@/lib/prisma";
import { limitByIp } from "@/lib/rate-limit";
import { getSiteSettings } from "@/lib/settings";
import { formatInZone } from "@/lib/time";
import { absoluteUrl, formatPrice } from "@/lib/utils";
import {
  contactMessageSchema,
  enquirySchema,
  financingSchema,
  reservationPaymentSchema,
  testDriveSchema,
  tradeInSchema,
} from "@/lib/validations/leads";

type LeadResult = ActionResult<{ reference: string }>;

const TOO_MANY = "You've sent several requests in a short time. Please wait a few minutes, or contact us directly.";
const BOT_OK: LeadResult = { ok: true, message: "Thank you — we'll be in touch shortly.", data: { reference: "—" } };

function handleError(scope: string, error: unknown): LeadResult {
  if (error instanceof LeadError) return fail(error.message);
  return unexpected(scope, error);
}

// ── General / vehicle / callback / inspection / reservation / sourcing ──

export async function submitEnquiry(raw: unknown): Promise<LeadResult> {
  const parsed = enquirySchema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;
  if (v.website) return BOT_OK;
  if (!limitByIp("lead", 8, 15 * 60_000)) return fail(TOO_MANY);

  const sourcing =
    v.type === "SOURCING"
      ? ([
          ["Wanted make", v.sourcingMake],
          ["Wanted model", v.sourcingModel],
          ["Budget", v.sourcingBudget],
        ] as Array<[string, string | undefined]>)
      : [];
  const sourcingText = sourcing.filter(([, val]) => val).map(([k, val]) => `${k}: ${val}`).join("\n");
  const message = [sourcingText, v.message].filter(Boolean).join("\n\n") || undefined;

  try {
    const lead = await createLead({
      type: EnquiryType[v.type],
      contact: { fullName: v.fullName, email: v.email, phone: v.phone },
      vehicleId: v.vehicleId,
      message,
      preferredContact: v.preferredContact,
      source: v.source ?? "website",
      emailDetails: [["Preferred contact", v.preferredContact]],
    });
    return { ok: true, message: "Thank you — we'll be in touch shortly.", data: { reference: lead.reference } };
  } catch (error) {
    return handleError("submitEnquiry", error);
  }
}

// ── Test drive ───────────────────────────────────────────────────────

export async function getTestDriveSlots(vehicleId: string, date: string): Promise<string[]> {
  if (!/^[a-z0-9]{20,40}$/i.test(vehicleId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  if (!limitByIp("slots", 120, 10 * 60_000)) return [];
  const settings = await getSiteSettings();
  return availableSlots(prisma, vehicleId, date, settings.timezone);
}

export async function submitTestDrive(raw: unknown): Promise<LeadResult> {
  const parsed = testDriveSchema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;
  if (v.website) return BOT_OK;
  if (!limitByIp("lead", 8, 15 * 60_000)) return fail(TOO_MANY);

  const settings = await getSiteSettings();
  const slot = checkRequestedSlot(v.preferredDate, v.preferredTime, settings.timezone);
  if (!slot.ok) return { ok: false, message: slot.message, fieldErrors: { preferredDate: [slot.message] } };
  const when = formatInZone(slot.start, settings.timezone, settings.locale, { dateStyle: "full", timeStyle: "short" });

  try {
    const lead = await createLead({
      type: EnquiryType.TEST_DRIVE,
      contact: { fullName: v.fullName, email: v.email, phone: v.phone },
      vehicleId: v.vehicleId,
      message: v.message,
      source: "vehicle_page",
      skipCustomerEmail: true,
      emailDetails: [["Requested time", when]],
      detail: async (tx, enquiryId, customerId) => {
        const conflict = await findConflict(tx, { vehicleId: v.vehicleId, start: slot.start });
        if (conflict) throw new LeadError("That time has just been booked. Please choose another slot.");
        await tx.testDriveBooking.create({
          data: {
            enquiryId,
            customerId,
            vehicleId: v.vehicleId,
            preferredDate: new Date(`${v.preferredDate}T00:00:00.000Z`),
            preferredTime: v.preferredTime,
            scheduledAt: slot.start,
            message: v.message,
          },
        });
      },
    });

    const mail = appointmentUpdate(brandFromSettings(settings), {
      name: v.fullName,
      kind: "requested",
      vehicleTitle: lead.vehicleTitle ?? "Your selected vehicle",
      when,
      reference: lead.reference,
    });
    await sendEmail({ to: v.email, replyTo: settings.email ?? undefined, ...mail });

    return {
      ok: true,
      message: "Request received. We'll confirm your appointment by email shortly.",
      data: { reference: lead.reference },
    };
  } catch (error) {
    return handleError("submitTestDrive", error);
  }
}

// ── Financing ───────────────────────────────────────────────────────

export async function submitFinancing(raw: unknown): Promise<LeadResult> {
  const parsed = financingSchema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;
  if (v.website) return BOT_OK;
  if (!limitByIp("lead", 8, 15 * 60_000)) return fail(TOO_MANY);

  const settings = await getSiteSettings();
  // Use the listed price when a vehicle is chosen; never trust a client-sent price for it.
  const vehicle = v.vehicleId
    ? await prisma.vehicle.findUnique({ where: { id: v.vehicleId }, select: { price: true, currency: true } })
    : null;
  const price = vehicle ? Number(vehicle.price) : v.vehiclePrice;
  if (price !== undefined && v.proposedDeposit !== undefined && v.proposedDeposit > price) {
    return { ok: false, message: "The deposit can't be more than the vehicle price.", fieldErrors: { proposedDeposit: ["Deposit exceeds price."] } };
  }
  const money = (n?: number) => (n === undefined ? undefined : formatPrice(n, vehicle?.currency ?? settings.currency, settings.locale));

  try {
    const lead = await createLead({
      type: EnquiryType.FINANCING,
      contact: { fullName: v.fullName, email: v.email, phone: v.phone },
      vehicleId: v.vehicleId,
      message: v.additionalDetails,
      source: "financing",
      emailDetails: [
        ["Vehicle price", money(price)],
        ["Proposed deposit", money(v.proposedDeposit)],
        ["Term", v.termMonths ? `${v.termMonths} months` : undefined],
        ["Employment", v.employmentStatus],
        ["Employer", v.employerName],
      ],
      detail: async (tx, enquiryId) => {
        await tx.financingEnquiry.create({
          data: {
            enquiryId,
            vehicleId: v.vehicleId,
            vehiclePrice: price !== undefined ? new Prisma.Decimal(price) : undefined,
            proposedDeposit: v.proposedDeposit !== undefined ? new Prisma.Decimal(v.proposedDeposit) : undefined,
            termMonths: v.termMonths ? Number(v.termMonths) : undefined,
            employmentStatus: v.employmentStatus,
            employerName: v.employerName,
            additionalDetails: v.additionalDetails,
          },
        });
      },
    });
    return { ok: true, message: "Thank you — our team will review your enquiry and contact you.", data: { reference: lead.reference } };
  } catch (error) {
    return handleError("submitFinancing", error);
  }
}

// ── Trade-in ────────────────────────────────────────────────────────

export async function getTradeInUploadSignature(): Promise<ActionResult<UploadSignature>> {
  if (!isCloudinaryConfigured()) return fail("Photo uploads aren't available right now. You can still submit without photos.");
  if (!limitByIp("tradein-sign", 20, 15 * 60_000)) return fail(TOO_MANY);
  const signature = createUploadSignature("trade-ins");
  return signature ? { ok: true, data: signature } : fail("Photo uploads aren't available right now.");
}

export async function submitTradeIn(raw: unknown): Promise<LeadResult> {
  const parsed = tradeInSchema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;
  if (v.website) return BOT_OK;
  if (!limitByIp("lead", 8, 15 * 60_000)) return fail(TOO_MANY);

  // Verify every photo really is an image we accept, in the trade-in folder.
  const verified = await Promise.all(v.imagePublicIds.map((id) => verifyAsset(id, "trade-ins")));
  if (verified.some((a) => a === null)) {
    return { ok: false, message: "One of the photos couldn't be verified. Please remove it and try again.", fieldErrors: { imagePublicIds: ["Invalid photo."] } };
  }
  const imageUrls = verified.map((a) => a!.url);
  const settings = await getSiteSettings();

  try {
    const lead = await createLead({
      type: EnquiryType.TRADE_IN,
      contact: { fullName: v.fullName, email: v.email, phone: v.phone },
      vehicleId: v.targetVehicleId,
      message: v.message,
      source: "trade_in",
      emailDetails: [
        ["Trade-in vehicle", `${v.year} ${v.make} ${v.model}`],
        ["Mileage", `${v.mileage.toLocaleString()} ${settings.mileageUnit}`],
        ["Condition", v.condition],
        ["Expected value", v.expectedValue !== undefined ? formatPrice(v.expectedValue, settings.currency, settings.locale) : undefined],
        ["Photos", imageUrls.length ? `${imageUrls.length} attached in dashboard` : undefined],
      ],
      detail: async (tx, enquiryId) => {
        await tx.tradeInEnquiry.create({
          data: {
            enquiryId,
            targetVehicleId: v.targetVehicleId,
            make: v.make,
            model: v.model,
            year: v.year,
            mileage: v.mileage,
            condition: v.condition,
            expectedValue: v.expectedValue !== undefined ? new Prisma.Decimal(v.expectedValue) : undefined,
            imageUrls,
          },
        });
      },
    });
    return { ok: true, message: "Thank you — we'll review your vehicle and come back to you with a valuation.", data: { reference: lead.reference } };
  } catch (error) {
    return handleError("submitTradeIn", error);
  }
}

// ── Contact form ────────────────────────────────────────────────────

export async function submitContactMessage(raw: unknown): Promise<ActionResult> {
  const parsed = contactMessageSchema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;
  if (v.website) return { ok: true, message: "Thank you — we'll reply shortly." };
  if (!limitByIp("contact", 6, 15 * 60_000)) return fail(TOO_MANY);

  try {
    const row = await prisma.contactMessage.create({
      data: {
        fullName: v.fullName,
        email: v.email,
        phone: v.phone,
        category: EnquiryType[v.category],
        subject: v.subject,
        message: v.message,
      },
    });
    await logActivity({ action: "contact.received", entityType: "ContactMessage", entityId: row.id, summary: `Message from ${v.fullName}` });
    await notifyStaff({ type: "contact.new", title: `New message — ${v.fullName}`, body: v.subject, link: `/admin/messages?open=${row.id}` }).catch(
      (e: unknown) => console.error("[contact] notify failed", e),
    );

    const settings = await getSiteSettings();
    const to = adminRecipient(settings.email);
    if (to) {
      const mail = staffContactMessage(brandFromSettings(settings), {
        name: v.fullName,
        email: v.email,
        phone: v.phone ?? null,
        category: ENQUIRY_TYPE_LABELS[EnquiryType[v.category]],
        subject: v.subject ?? null,
        message: v.message,
        adminUrl: absoluteUrl(`/admin/messages?open=${row.id}`),
      });
      await sendEmail({ to, replyTo: v.email, ...mail });
    }
    return { ok: true, message: "Thank you — we'll reply shortly." };
  } catch (error) {
    return unexpected("submitContactMessage", error);
  }
}

// ── Online reservation deposit (Paystack) ───────────────────────────

export async function startReservationPayment(raw: unknown): Promise<ActionResult<{ authorizationUrl: string }>> {
  const parsed = reservationPaymentSchema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;
  if (v.website) return fail("Unable to start payment.");
  if (!limitByIp("payment", 5, 15 * 60_000)) return fail(TOO_MANY);
  if (!isPaystackConfigured()) return fail("Online payment isn't available right now. Please use the reservation request instead.");

  try {
    const settings = await getSiteSettings();
    const deposit = formatPrice(Number(settings.reservationDepositAmount), "NGN", "en-NG");
    const lead = await createLead({
      type: EnquiryType.RESERVATION,
      contact: { fullName: v.fullName, email: v.email, phone: v.phone },
      vehicleId: v.vehicleId,
      message: `Online reservation — paying a ${deposit} deposit via Paystack.`,
      source: "online_reservation",
      skipCustomerEmail: true, // the receipt is sent once payment is confirmed
      emailDetails: [["Payment", "Customer was sent to Paystack checkout"]],
    });
    const session = await startDepositPayment({
      vehicleId: v.vehicleId,
      customerId: lead.customerId,
      enquiryId: lead.enquiryId,
      email: v.email,
      customerName: v.fullName,
    });
    return { ok: true, data: { authorizationUrl: session.authorizationUrl } };
  } catch (error) {
    if (error instanceof PaymentError) return fail(error.message);
    return handleError("startReservationPayment", error);
  }
}
