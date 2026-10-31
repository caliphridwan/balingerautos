"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { recheckPayment, refundPayment } from "@/app/admin/actions/payments";
import type { ActionResult } from "@/lib/actions";

export function PaymentActions({ id, reference, status, canRefund, vehicleReserved }: { id: string; reference: string; status: string; canRefund: boolean; vehicleReserved: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [release, setRelease] = useState(status === "SUCCESS" && vehicleReserved);

  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? (r.message ?? "Done") : r.message);
      setConfirming(false);
      router.refresh();
    });

  const btn = "h-9 border border-[#D4D1C8] px-2.5 text-xs font-semibold hover:border-obsidian disabled:opacity-50";
  const refundable = canRefund && (status === "SUCCESS" || status === "NEEDS_REFUND");

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-2">
        {status === "PENDING" || status === "ABANDONED" || status === "FAILED" ? (
          <button type="button" disabled={pending} onClick={() => run(() => recheckPayment(reference))} className={btn}>
            Re-check
          </button>
        ) : null}
        {refundable && !confirming ? (
          <button type="button" disabled={pending} onClick={() => setConfirming(true)} className={`${btn} border-[#E6C2BA] text-[#7A2A1E]`}>
            Refund
          </button>
        ) : null}
      </div>
      {confirming ? (
        <div className="flex flex-col items-end gap-1.5 border border-[#E6C2BA] bg-[#FBF1EE] p-2 text-left text-xs">
          {status === "SUCCESS" && vehicleReserved ? (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={release} onChange={(e) => setRelease(e.target.checked)} className="h-4 w-4" />
              Make the vehicle available again
            </label>
          ) : null}
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirming(false)} className={btn}>Cancel</button>
            <button type="button" disabled={pending} onClick={() => run(() => refundPayment(id, release))} className="h-9 bg-[#7A2A1E] px-2.5 text-xs font-semibold text-white">
              {pending ? "Refunding…" : "Confirm refund"}
            </button>
          </div>
        </div>
      ) : null}
      {msg ? <span role="status" className="max-w-[220px] text-xs text-ink-muted">{msg}</span> : null}
    </div>
  );
}
