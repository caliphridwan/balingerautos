import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Paystack REST API (https://paystack.com/docs/api). No SDK needed.
 * Amounts go to Paystack in KOBO (₦1 = 100 kobo).
 */

const BASE = "https://api.paystack.co";

function secretKey(): string | null {
  return process.env.PAYSTACK_SECRET_KEY || null;
}

export function isPaystackConfigured(): boolean {
  return Boolean(secretKey());
}

/** True when using test keys — shown in the dashboard so nobody mistakes test payments for real ones. */
export function isPaystackTestMode(): boolean {
  return (secretKey() ?? "").startsWith("sk_test_");
}

export function nairaToKobo(amount: number): number {
  return Math.round(amount * 100);
}

interface PaystackEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const key = secretKey();
  if (!key) throw new Error("Paystack is not configured");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as PaystackEnvelope<T> | null;
  if (!res.ok || !body?.status) {
    throw new Error(`Paystack ${path} failed (${res.status}): ${body?.message ?? "no response"}`);
  }
  return body.data;
}

export interface InitializeResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export function initializeTransaction(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<InitializeResult> {
  return call<InitializeResult>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  });
}

export interface VerifiedTransaction {
  id: number;
  status: "success" | "failed" | "abandoned" | "reversed" | "ongoing" | "pending" | "processing" | "queued";
  reference: string;
  amount: number; // kobo
  currency: string;
  channel: string | null;
  gateway_response: string | null;
  paid_at: string | null;
  customer?: { email?: string };
}

export function verifyTransaction(reference: string): Promise<VerifiedTransaction> {
  return call<VerifiedTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

export function refundTransaction(reference: string, reason?: string): Promise<{ status: string }> {
  return call<{ status: string }>("/refund", {
    method: "POST",
    body: JSON.stringify({ transaction: reference, merchant_note: reason?.slice(0, 200) }),
  });
}

/** Paystack signs webhooks with HMAC-SHA512 of the raw body using the secret key. */
export function isValidWebhookSignature(rawBody: string, signature: string | null): boolean {
  const key = secretKey();
  if (!key || !signature) return false;
  const expected = createHmac("sha512", key).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
