"use client";

import { useEffect } from "react";

const MAX_ATTEMPTS = 6;

/** Re-verifies a still-processing payment a few times (bank transfers can take a moment). */
export function PendingRefresh({ reference, attempt }: { reference: string; attempt: number }) {
  const done = attempt >= MAX_ATTEMPTS;
  useEffect(() => {
    if (done) return;
    const t = window.setTimeout(() => {
      window.location.replace(`/api/paystack/callback?reference=${encodeURIComponent(reference)}&check=${attempt + 1}`);
    }, 6000);
    return () => window.clearTimeout(t);
  }, [done, attempt, reference]);
  return (
    <p role="status" className="text-sm text-ink-muted">
      {done
        ? "Still processing. You can close this page — we'll email you as soon as the payment is confirmed."
        : "Checking again automatically…"}
    </p>
  );
}
