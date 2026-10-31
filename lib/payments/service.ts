import "server-only";
import { randomBytes } from "node:crypto";
import {
  CommunicationChannel,
  EnquiryStatus,
  PaymentStatus,
  Prisma,
  VehicleStatus,
} from "@prisma/client";
import { logActivity, notifyStaff } from "@/lib/activity";
import { adminRecipient, sendEmail } from "@/lib/email/send";
import { paymentReceipt, staffPaymentAlert } from "@/lib/email/templates";
import { brandFromSettings } from "@/lib/leads/create";
import { initializeTransaction, nairaToKobo, verifyTransaction } from "@/lib/paystack";
import { prisma } from "@/lib/prisma";
import { revalidateInventory } from "@/lib/revalidate";
import { getSiteSettings } from "@/lib/settings";
import { absoluteUrl, formatPrice } from "@/lib/utils";
import { vehicleTitle } from "@/lib/vehicles/format";

const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function paymentReference(): string {
  const suffix = Array.from(randomBytes(8), (b) => REF_ALPHABET[b % REF_ALPHABET.length]).join("");
  return `BAPAY-${suffix}`;
}

/** Deposit actually charged: the configured amount, but never more than the vehicle price. */
export function depositFor(vehiclePrice: number, configured: number): number {
  return Math.max(0, Math.min(configured, vehiclePrice));
}

export class PaymentError extends Error {}

/**
 * Creates a PENDING payment and a Paystack checkout session.
 * Returns the Paystack-hosted URL to redirect the customer to.
 */
export async function startDepositPayment(input: {
  vehicleId: string;
  customerId: string;
  enquiryId: string;
  email: string;
  customerName: string;
}): Promise<{ authorizationUrl: string; reference: string }> {
  const settings = await getSiteSettings();
  if (!settings.reservationDepositEnabled) throw new PaymentError("Online reservations are not available right now.");

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: input.vehicleId, isPublished: true },
    select: { id: true, slug: true, status: true, price: true, currency: true, priceOnRequest: true, stockNumber: true, year: true, make: true, model: true, trim: true },
  });
  if (!vehicle || vehicle.status !== VehicleStatus.AVAILABLE) throw new PaymentError("This vehicle is no longer available to reserve.");
  if (vehicle.currency !== "NGN") throw new PaymentError("Online payment is only available for vehicles priced in naira.");
  if (vehicle.priceOnRequest) throw new PaymentError("Please contact our team to reserve this vehicle.");

  const amount = depositFor(Number(vehicle.price), Number(settings.reservationDepositAmount));
  if (amount < 100) throw new PaymentError("The reservation deposit isn't set up correctly. Please contact our team.");

  const reference = paymentReference();
  await prisma.payment.create({
    data: {
      reference,
      amount: new Prisma.Decimal(amount),
      currency: "NGN",
      email: input.email,
      customerId: input.customerId,
      vehicleId: vehicle.id,
      enquiryId: input.enquiryId,
    },
  });

  try {
    const session = await initializeTransaction({
      email: input.email,
      amountKobo: nairaToKobo(amount),
      reference,
      callbackUrl: absoluteUrl("/api/paystack/callback"),
      metadata: {
        purpose: "reservation_deposit",
        vehicle: `${vehicleTitle(vehicle)} (${vehicle.stockNumber})`,
        enquiry_id: input.enquiryId,
        custom_fields: [
          { display_name: "Vehicle", variable_name: "vehicle", value: `${vehicleTitle(vehicle)} · ${vehicle.stockNumber}` },
          { display_name: "Customer", variable_name: "customer", value: input.customerName },
        ],
      },
    });
    await prisma.payment.update({ where: { reference }, data: { accessCode: session.access_code, authorizationUrl: session.authorization_url } });
    return { authorizationUrl: session.authorization_url, reference };
  } catch (error) {
    await prisma.payment.update({ where: { reference }, data: { status: PaymentStatus.FAILED, gatewayResponse: "Could not start checkout" } });
    console.error("[paystack] initialize failed", error);
    throw new PaymentError("We couldn't start the payment. Please try again in a moment.");
  }
}

export type ApplyOutcome =
  | { state: "success"; reference: string; vehicleTitle: string; amountLabel: string; holdUntil: Date | null }
  | { state: "needs_refund"; reference: string; vehicleTitle: string; amountLabel: string }
  | { state: "failed" | "pending"; reference: string; message: string }
  | { state: "not_found" };

/**
 * The single source of truth for a payment's outcome. Called from both the
 * customer redirect and the Paystack webhook; safe to call any number of
 * times. Always re-verifies with Paystack's API — never trusts the browser.
 */
export async function verifyAndApply(reference: string): Promise<ApplyOutcome> {
  const payment = await prisma.payment.findUnique({
    where: { reference },
    include: {
      vehicle: { select: { id: true, slug: true, status: true, year: true, make: true, model: true, trim: true, stockNumber: true } },
      customer: { select: { fullName: true, email: true } },
      enquiry: { select: { id: true, reference: true } },
    },
  });
  if (!payment) return { state: "not_found" };

  const title = vehicleTitle(payment.vehicle);
  const amountLabel = formatPrice(Number(payment.amount), payment.currency, "en-NG");

  if (payment.status === PaymentStatus.SUCCESS) {
    const v = await prisma.vehicle.findUnique({ where: { id: payment.vehicleId }, select: { reservedUntil: true } });
    return { state: "success", reference, vehicleTitle: title, amountLabel, holdUntil: v?.reservedUntil ?? null };
  }
  if (payment.status === PaymentStatus.NEEDS_REFUND || payment.status === PaymentStatus.REFUNDED) {
    return { state: "needs_refund", reference, vehicleTitle: title, amountLabel };
  }

  let tx;
  try {
    tx = await verifyTransaction(reference);
  } catch (error) {
    console.error("[paystack] verify failed", reference, error);
    return { state: "pending", reference, message: "We're confirming your payment with Paystack. This page will update shortly." };
  }

  if (tx.status !== "success") {
    const final = tx.status === "failed" || tx.status === "abandoned" || tx.status === "reversed";
    if (final) {
      await prisma.payment.updateMany({
        where: { reference, status: PaymentStatus.PENDING },
        data: { status: tx.status === "abandoned" ? PaymentStatus.ABANDONED : PaymentStatus.FAILED, gatewayResponse: tx.gateway_response, channel: tx.channel },
      });
    }
    return {
      state: final ? "failed" : "pending",
      reference,
      message: final ? "The payment wasn't completed. No money was taken." : "Your payment is still processing. We'll email you as soon as it's confirmed.",
    };
  }

  // Guard against tampering: amount and currency must match what we asked for.
  if (tx.amount !== nairaToKobo(Number(payment.amount)) || tx.currency !== payment.currency) {
    await prisma.payment.update({
      where: { reference },
      data: { status: PaymentStatus.NEEDS_REFUND, notes: `Amount/currency mismatch: got ${tx.amount} ${tx.currency}`, paystackId: String(tx.id) },
    });
    await notifyStaff({ type: "payment.mismatch", title: `Payment ${reference} needs review (amount mismatch)`, link: "/admin/payments" });
    return { state: "needs_refund", reference, vehicleTitle: title, amountLabel };
  }

  const settings = await getSiteSettings();
  const holdUntil = new Date(Date.now() + settings.reservationHoldDays * 86_400_000);

  // Reserve the vehicle only if it is still available — in one transaction, so two
  // simultaneous payments can't both reserve it.
  const result = await prisma.$transaction(
    async (db) => {
      const claim = await db.payment.updateMany({
        where: { reference, status: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED, PaymentStatus.ABANDONED] } },
        data: {
          status: PaymentStatus.SUCCESS,
          paidAt: tx.paid_at ? new Date(tx.paid_at) : new Date(),
          channel: tx.channel,
          gatewayResponse: tx.gateway_response,
          paystackId: String(tx.id),
        },
      });
      if (claim.count === 0) return "already" as const; // another call applied it first

      const reserved = await db.vehicle.updateMany({
        where: { id: payment.vehicleId, status: VehicleStatus.AVAILABLE },
        data: { status: VehicleStatus.RESERVED, reservedUntil: holdUntil },
      });
      if (reserved.count === 0) {
        await db.payment.update({ where: { reference }, data: { status: PaymentStatus.NEEDS_REFUND, notes: "Vehicle was no longer available when payment completed." } });
      }
      if (payment.enquiryId) {
        await db.vehicleEnquiry.update({ where: { id: payment.enquiryId }, data: { status: EnquiryStatus.QUALIFIED } });
        await db.enquiryCommunication.create({
          data: {
            enquiryId: payment.enquiryId,
            channel: CommunicationChannel.NOTE,
            body: reserved.count
              ? `Reservation deposit of ${amountLabel} paid online (Paystack ${reference}, ${tx.channel ?? "unknown channel"}). Vehicle reserved until ${holdUntil.toDateString()}.`
              : `Deposit of ${amountLabel} paid (Paystack ${reference}) but the vehicle was no longer available — REFUND REQUIRED.`,
          },
        });
      }
      await logActivity(
        {
          action: reserved.count ? "payment.succeeded" : "payment.needs_refund",
          entityType: "Payment",
          entityId: payment.id,
          summary: reserved.count ? `received a ${amountLabel} deposit for ${title} from ${payment.customer.fullName}` : `deposit for ${title} needs a refund`,
        },
        db,
      );
      return reserved.count ? ("reserved" as const) : ("refund" as const);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  if (result === "already") return verifyAndApply(reference);

  // Side effects after commit (best-effort).
  revalidateInventory(payment.vehicle.slug);
  const brand = brandFromSettings(settings);
  const adminUrl = absoluteUrl(`/admin/payments?ref=${reference}`);
  try {
    await notifyStaff({
      type: result === "reserved" ? "payment.success" : "payment.needs_refund",
      title: result === "reserved" ? `Deposit received — ${title}` : `Refund needed — ${title}`,
      body: `${amountLabel} from ${payment.customer.fullName}`,
      link: `/admin/payments?ref=${reference}`,
    });
    const staffTo = adminRecipient(settings.email);
    const jobs: Array<Promise<unknown>> = [];
    if (staffTo) {
      jobs.push(sendEmail({ to: staffTo, ...staffPaymentAlert(brand, { reference, amountLabel, vehicleTitle: `${title} (${payment.vehicle.stockNumber})`, customerName: payment.customer.fullName, customerEmail: payment.customer.email, needsRefund: result === "refund", adminUrl }) }));
    }
    jobs.push(
      sendEmail({
        to: payment.customer.email,
        replyTo: settings.email ?? undefined,
        ...paymentReceipt(brand, {
          name: payment.customer.fullName,
          reference,
          amountLabel,
          vehicleTitle: title,
          vehicleUrl: absoluteUrl(`/inventory/${payment.vehicle.slug}`),
          holdUntil: result === "reserved" ? holdUntil.toLocaleDateString("en-NG", { dateStyle: "long", timeZone: settings.timezone }) : null,
          needsRefund: result === "refund",
        }),
      }),
    );
    await Promise.allSettled(jobs);
  } catch (error) {
    console.error("[payments] notify failed", error);
  }

  return result === "reserved"
    ? { state: "success", reference, vehicleTitle: title, amountLabel, holdUntil }
    : { state: "needs_refund", reference, vehicleTitle: title, amountLabel };
}

/** Read-only view of a payment's outcome for the results page (no API calls, no side effects). */
export async function readOutcome(reference: string): Promise<ApplyOutcome> {
  const payment = await prisma.payment.findUnique({
    where: { reference },
    include: { vehicle: { select: { year: true, make: true, model: true, trim: true, reservedUntil: true } } },
  });
  if (!payment) return { state: "not_found" };
  const title = vehicleTitle(payment.vehicle);
  const amountLabel = formatPrice(Number(payment.amount), payment.currency, "en-NG");
  switch (payment.status) {
    case PaymentStatus.SUCCESS:
      return { state: "success", reference, vehicleTitle: title, amountLabel, holdUntil: payment.vehicle.reservedUntil };
    case PaymentStatus.NEEDS_REFUND:
    case PaymentStatus.REFUNDED:
      return { state: "needs_refund", reference, vehicleTitle: title, amountLabel };
    case PaymentStatus.FAILED:
    case PaymentStatus.ABANDONED:
      return { state: "failed", reference, message: "The payment wasn't completed. No money was taken." };
    default:
      return { state: "pending", reference, message: "We're confirming your payment with Paystack. This page will update shortly." };
  }
}
