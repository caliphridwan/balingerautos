import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { readOutcome, type ApplyOutcome } from "@/lib/payments/service";
import { getSiteSettings } from "@/lib/settings";
import { PendingRefresh } from "./pending-refresh";

export const metadata: Metadata = { title: "Payment", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PaymentResultPage({ searchParams }: { searchParams: { reference?: string; check?: string } }) {
  const reference = (searchParams.reference ?? "").trim();
  const settings = await getSiteSettings();
  const outcome: ApplyOutcome = /^BAPAY-[A-Z0-9]{6,20}$/.test(reference) ? await readOutcome(reference) : { state: "not_found" };
  const heading = "heading-display text-[clamp(2rem,4vw,3rem)]";
  const body = "text-[17px] leading-relaxed text-ink-body";

  return (
    <section className="bg-ivory">
      <div className="mx-auto flex max-w-2xl flex-col items-start gap-6 px-6 py-24">
        {outcome.state === "success" ? (
          <>
            <CheckCircle2 aria-hidden="true" className="h-12 w-12 text-deepgold" strokeWidth={1.3} />
            <h1 className={heading}>Your vehicle is reserved</h1>
            <p className={body}>
              Thank you. We've received your deposit of <strong className="text-obsidian">{outcome.amountLabel}</strong> for the{" "}
              <strong className="text-obsidian">{outcome.vehicleTitle}</strong>
              {outcome.holdUntil ? `, reserved for you until ${outcome.holdUntil.toLocaleDateString("en-NG", { dateStyle: "long", timeZone: settings.timezone })}` : ""}. A
              receipt is on its way to your email and our sales team will contact you shortly.
            </p>
            <p className="text-sm text-ink-muted">Payment reference: {outcome.reference}</p>
            <ButtonLink href="/inventory" variant="dark">Back to inventory</ButtonLink>
          </>
        ) : outcome.state === "needs_refund" ? (
          <>
            <Clock aria-hidden="true" className="h-12 w-12 text-deepgold" strokeWidth={1.3} />
            <h1 className={heading}>Your payment was received</h1>
            <p className={body}>
              Unfortunately the {outcome.vehicleTitle} was reserved by another customer just before your payment completed. Your deposit of{" "}
              {outcome.amountLabel} will be refunded in full, and our team will contact you to help find an alternative.
            </p>
            <p className="text-sm text-ink-muted">Payment reference: {outcome.reference}</p>
            <ButtonLink href="/contact" variant="dark">Contact our team</ButtonLink>
          </>
        ) : outcome.state === "pending" ? (
          <>
            <Clock aria-hidden="true" className="h-12 w-12 text-deepgold" strokeWidth={1.3} />
            <h1 className={heading}>Confirming your payment…</h1>
            <p className={body}>{outcome.message}</p>
            <p className="text-sm text-ink-muted">Payment reference: {outcome.reference}</p>
            <PendingRefresh reference={outcome.reference} attempt={Math.max(0, Number(searchParams.check) || 0)} />
          </>
        ) : outcome.state === "failed" ? (
          <>
            <XCircle aria-hidden="true" className="h-12 w-12 text-[#9F3A2B]" strokeWidth={1.3} />
            <h1 className={heading}>Payment not completed</h1>
            <p className={body}>{outcome.message} You can try again from the vehicle page, or contact our team.</p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/inventory" variant="dark">Back to inventory</ButtonLink>
              <ButtonLink href="/contact" variant="outline">Contact us</ButtonLink>
            </div>
          </>
        ) : (
          <>
            <h1 className={heading}>We couldn't find that payment</h1>
            <p className={body}>
              If money was taken from your account, please <Link href="/contact" className="underline">contact us</Link> with your Paystack receipt.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
