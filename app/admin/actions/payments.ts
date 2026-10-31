"use server";

import { revalidatePath } from "next/cache";
import { PaymentStatus, VehicleStatus } from "@prisma/client";
import { fail, unexpected, type ActionResult } from "@/lib/actions";
import { logActivity } from "@/lib/activity";
import { AuthError, requireAction } from "@/lib/auth/guards";
import { verifyAndApply } from "@/lib/payments/service";
import { refundTransaction } from "@/lib/paystack";
import { prisma } from "@/lib/prisma";
import { revalidateInventory } from "@/lib/revalidate";

function handle(scope: string, error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail(error.message);
  return unexpected(scope, error);
}

/** Re-checks a payment with Paystack (e.g. a pending bank transfer). */
export async function recheckPayment(reference: string): Promise<ActionResult> {
  try {
    await requireAction("payments:read");
    const outcome = await verifyAndApply(reference);
    revalidatePath("/admin/payments");
    const label = { success: "Payment confirmed.", needs_refund: "Paid, but needs a refund.", failed: "Payment failed or was abandoned.", pending: "Still pending at Paystack.", not_found: "Payment not found." }[outcome.state];
    return { ok: true, message: label };
  } catch (error) {
    return handle("recheckPayment", error);
  }
}

/**
 * Refunds a successful deposit through Paystack. Optionally releases the
 * vehicle back to AVAILABLE if this payment was holding it.
 */
export async function refundPayment(id: string, releaseVehicle: boolean): Promise<ActionResult> {
  try {
    const actor = await requireAction("payments:manage");
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { vehicle: { select: { id: true, slug: true, status: true } }, customer: { select: { fullName: true } } },
    });
    if (!payment) return fail("Payment not found.");
    if (payment.status !== PaymentStatus.SUCCESS && payment.status !== PaymentStatus.NEEDS_REFUND) {
      return fail("Only successful payments can be refunded.");
    }
    try {
      await refundTransaction(payment.reference, `Balinger Autos refund ${payment.reference}`);
    } catch (error) {
      console.error("[paystack] refund failed", error);
      return fail("Paystack declined the refund request. Check the Paystack dashboard (balance or refund window) and try again.");
    }
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { id }, data: { status: PaymentStatus.REFUNDED, refundedAt: new Date(), notes: `${payment.notes ? `${payment.notes}\n` : ""}Refund requested by ${actor.name}.` } });
      if (releaseVehicle && payment.status === PaymentStatus.SUCCESS && payment.vehicle.status === VehicleStatus.RESERVED) {
        await tx.vehicle.update({ where: { id: payment.vehicleId }, data: { status: VehicleStatus.AVAILABLE, reservedUntil: null } });
      }
      if (payment.enquiryId) {
        await tx.enquiryCommunication.create({
          data: { enquiryId: payment.enquiryId, authorId: actor.id, channel: "NOTE", body: `Deposit ${payment.reference} refunded via Paystack${releaseVehicle ? "; vehicle released" : ""}.` },
        });
      }
      await logActivity({ actorId: actor.id, action: "payment.refunded", entityType: "Payment", entityId: id, summary: `refunded ${payment.customer.fullName}'s deposit (${payment.reference})` }, tx);
    });
    revalidatePath("/admin/payments");
    if (releaseVehicle) revalidateInventory(payment.vehicle.slug);
    return { ok: true, message: "Refund submitted to Paystack. It usually reaches the customer within a few working days." };
  } catch (error) {
    return handle("refundPayment", error);
  }
}
