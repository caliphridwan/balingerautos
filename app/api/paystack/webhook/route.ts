import { NextResponse } from "next/server";
import { verifyAndApply } from "@/lib/payments/service";
import { isValidWebhookSignature } from "@/lib/paystack";

/**
 * Paystack webhook. Set this URL in Paystack Dashboard → Settings → API Keys & Webhooks:
 *   https://YOUR-DOMAIN/api/paystack/webhook
 *
 * The signature is checked against the raw body; the event itself is never
 * trusted — verifyAndApply() re-verifies the transaction with Paystack's API.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!isValidWebhookSignature(raw, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(raw) as typeof event;
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const reference = event.data?.reference;
  if (event.event === "charge.success" && reference && reference.startsWith("BAPAY-")) {
    try {
      await verifyAndApply(reference);
    } catch (error) {
      console.error("[paystack webhook] apply failed", reference, error);
      // Non-200 makes Paystack retry later.
      return NextResponse.json({ error: "Retry" }, { status: 500 });
    }
  }
  // Acknowledge everything else so Paystack doesn't retry events we don't use.
  return NextResponse.json({ received: true });
}
