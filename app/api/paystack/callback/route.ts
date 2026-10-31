import { NextResponse } from "next/server";
import { verifyAndApply } from "@/lib/payments/service";
import { absoluteUrl } from "@/lib/utils";

/**
 * Paystack redirects the customer here after checkout (?reference=…&trxref=…).
 * We verify with Paystack's API, apply the result, then show the result page.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const reference = (params.get("reference") ?? params.get("trxref") ?? "").trim();
  if (!/^BAPAY-[A-Z0-9]{6,20}$/.test(reference)) {
    return NextResponse.redirect(absoluteUrl("/payments/result"), 303);
  }
  try {
    await verifyAndApply(reference);
  } catch (error) {
    // The result page shows "confirming…" and retries; the webhook also completes it.
    console.error("[paystack callback]", reference, error);
  }
  const attempt = Math.min(Number(params.get("check")) || 0, 10);
  return NextResponse.redirect(absoluteUrl(`/payments/result?reference=${encodeURIComponent(reference)}${attempt ? `&check=${attempt}` : ""}`), 303);
}
