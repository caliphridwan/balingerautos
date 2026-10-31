"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  assignAppointment,
  cancelAppointment,
  completeAppointment,
  confirmAppointment,
  markNoShow,
  rejectAppointment,
  rescheduleAppointment,
} from "@/app/admin/actions/leads";
import { adminButton } from "@/components/admin/ui";
import type { ActionResult } from "@/lib/actions";
import { cn } from "@/lib/utils";

type Panel = null | "reschedule" | "reject" | "complete";

interface Props {
  id: string;
  status: string;
  assignedToId: string;
  staff: Array<{ id: string; name: string }>;
  slots: string[];
  defaultDate: string;
  defaultTime: string;
}

export function AppointmentActions({ id, status, assignedToId, staff, slots, defaultDate, defaultTime }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [panel, setPanel] = useState<Panel>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const closed = ["COMPLETED", "REJECTED", "CANCELLED", "NO_SHOW"].includes(status);
  const scheduled = status === "CONFIRMED" || status === "RESCHEDULED";

  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "Updated") : r.message });
      if (r.ok) setPanel(null);
      router.refresh();
    });

  const field = "h-10 rounded border border-[#D4D1C8] bg-white px-3 text-sm";

  return (
    <div className="flex w-full flex-col gap-3 lg:w-[420px]">
      {!closed ? (
        <div className="flex flex-wrap gap-2">
          {status === "PENDING" ? (
            <button type="button" disabled={pending} onClick={() => run(() => confirmAppointment(id))} className={adminButton.dark}>
              Approve
            </button>
          ) : null}
          <button type="button" disabled={pending} onClick={() => setPanel(panel === "reschedule" ? null : "reschedule")} className={adminButton.outline}>
            Reschedule
          </button>
          {status === "PENDING" ? (
            <button type="button" disabled={pending} onClick={() => setPanel(panel === "reject" ? null : "reject")} className={adminButton.danger}>
              Reject
            </button>
          ) : null}
          {scheduled ? (
            <>
              <button type="button" disabled={pending} onClick={() => setPanel(panel === "complete" ? null : "complete")} className={adminButton.outline}>
                Completed
              </button>
              <button type="button" disabled={pending} onClick={() => run(() => markNoShow(id))} className={adminButton.outline}>
                No-show
              </button>
              <button type="button" disabled={pending} onClick={() => run(() => cancelAppointment(id))} className={adminButton.danger}>
                Cancel
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {panel === "reschedule" ? (
        <form
          className="flex flex-wrap items-end gap-2 border border-ivory-line bg-ivory p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(() => rescheduleAppointment(id, fd));
          }}
        >
          <label className="flex flex-col gap-1 text-xs text-ink-muted">
            Date
            <input type="date" name="date" defaultValue={defaultDate} required className={field} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-muted">
            Time
            <input type="time" name="time" defaultValue={defaultTime} list={`slots-${id}`} required className={field} />
            <datalist id={`slots-${id}`}>
              {slots.map((s) => <option key={s} value={s} />)}
            </datalist>
          </label>
          <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-xs text-ink-muted">
            Note to customer (optional)
            <input name="note" maxLength={500} className={field} />
          </label>
          <button type="submit" disabled={pending} className={adminButton.dark}>Save & email</button>
        </form>
      ) : null}

      {panel === "reject" ? (
        <form
          className="flex flex-wrap items-end gap-2 border border-ivory-line bg-ivory p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const note = String(new FormData(e.currentTarget).get("note") ?? "");
            run(() => rejectAppointment(id, note));
          }}
        >
          <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs text-ink-muted">
            Reason / alternative to suggest (emailed to the customer)
            <input name="note" maxLength={500} className={field} />
          </label>
          <button type="submit" disabled={pending} className={adminButton.danger}>Reject & email</button>
        </form>
      ) : null}

      {panel === "complete" ? (
        <form
          className="flex flex-wrap items-end gap-2 border border-ivory-line bg-ivory p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            run(() => completeAppointment(id, fd));
          }}
        >
          <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs text-ink-muted">
            Outcome
            <input name="outcome" maxLength={2000} placeholder="e.g. Keen, discussing finance" className={field} />
          </label>
          <button type="submit" disabled={pending} className={adminButton.dark}>Record</button>
        </form>
      ) : null}

      {staff.length ? (
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          Staff
          <select value={assignedToId} disabled={pending} onChange={(e) => run(() => assignAppointment(id, e.target.value || null))} className={cn(field, "flex-1")}>
            <option value="">Unassigned</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      ) : null}

      {msg ? <p role="status" className={msg.ok ? "text-sm text-[#1E4A2E]" : "text-sm text-[#9F3A2B]"}>{msg.text}</p> : null}
    </div>
  );
}
