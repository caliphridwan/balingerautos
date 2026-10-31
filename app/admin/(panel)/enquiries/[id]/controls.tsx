"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addEnquiryCommunication, assignEnquiry, setEnquiryFollowUp, updateEnquiryStatus } from "@/app/admin/actions/leads";
import { AdminForm, aInput, aTextarea, AField } from "@/components/admin/admin-form";
import { adminButton } from "@/components/admin/ui";
import type { ActionResult } from "@/lib/actions";

const STATUSES = [
  ["NEW", "New"],
  ["CONTACTED", "Contacted"],
  ["FOLLOW_UP", "Follow-up"],
  ["QUALIFIED", "Qualified"],
  ["CONVERTED", "Converted"],
  ["CLOSED", "Closed"],
  ["CANCELLED", "Cancelled"],
] as const;

type Status = (typeof STATUSES)[number][0];

function useRunner() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "Saved") : r.message });
      router.refresh();
    });
  const note = msg ? <span role="status" className={msg.ok ? "text-xs text-[#1E4A2E]" : "text-xs text-[#9F3A2B]"}>{msg.text}</span> : null;
  return { pending, run, note };
}

export function StatusControl({ enquiryId, status }: { enquiryId: string; status: Status }) {
  const { pending, run, note } = useRunner();
  return (
    <AField label="Status">
      <select value={status} disabled={pending} onChange={(e) => run(() => updateEnquiryStatus(enquiryId, e.target.value as Status))} className={aInput}>
        {STATUSES.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
      {note}
    </AField>
  );
}

export function FollowUpControl({ enquiryId, value }: { enquiryId: string; value: string }) {
  const { pending, run, note } = useRunner();
  const [date, setDate] = useState(value);
  return (
    <div className="flex flex-col gap-1.5">
      <AField label="Follow-up date">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={aInput} />
      </AField>
      <div className="flex gap-2">
        <button type="button" disabled={pending || !date} onClick={() => run(() => setEnquiryFollowUp(enquiryId, date))} className={adminButton.outline}>
          Set follow-up
        </button>
        {value ? (
          <button type="button" disabled={pending} onClick={() => { setDate(""); run(() => setEnquiryFollowUp(enquiryId, null)); }} className={adminButton.outline}>
            Clear
          </button>
        ) : null}
      </div>
      {note}
    </div>
  );
}

export function AssignControl({ enquiryId, staff, current }: { enquiryId: string; staff: Array<{ id: string; name: string }>; current: string }) {
  const { pending, run, note } = useRunner();
  return (
    <AField label="Sales representative">
      <select value={current} disabled={pending} onChange={(e) => run(() => assignEnquiry(enquiryId, e.target.value || null))} className={aInput}>
        <option value="">Unassigned</option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      {note}
    </AField>
  );
}

export function CommunicationForm({ enquiryId }: { enquiryId: string }) {
  return (
    <AdminForm action={(fd) => addEnquiryCommunication(enquiryId, fd)} submitLabel="Add to history" resetOnSuccess>
      {(errors) => (
        <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <AField label="Type">
            <select name="channel" defaultValue="NOTE" className={aInput}>
              <option value="NOTE">Internal note</option>
              <option value="PHONE">Phone call</option>
              <option value="EMAIL">Email</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="IN_PERSON">In person</option>
            </select>
          </AField>
          <AField label="Details" error={errors.body}>
            <textarea name="body" rows={3} className={aTextarea} placeholder="What happened, what was agreed, next steps…" />
          </AField>
        </div>
      )}
    </AdminForm>
  );
}
