"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { convertMessageToEnquiry, setMessageStatus } from "@/app/admin/actions/leads";
import { adminButton } from "@/components/admin/ui";

export function MessageActions({ id, status, email, subject }: { id: string; status: string; email: string; subject: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const set = (s: "READ" | "REPLIED" | "ARCHIVED" | "NEW") =>
    start(async () => {
      const r = await setMessageStatus(id, s);
      if (!r.ok) setError(r.message);
      router.refresh();
    });

  return (
    <div className="flex flex-col items-start gap-2 lg:items-end">
      <div className="flex flex-wrap gap-2">
        <a
          href={`mailto:${email}?subject=${encodeURIComponent(`Re: ${subject ?? "Your message to Balinger Autos"}`)}`}
          onClick={() => set("REPLIED")}
          className={adminButton.dark}
        >
          Reply by email
        </a>
        {status === "NEW" ? <button type="button" disabled={pending} onClick={() => set("READ")} className={adminButton.outline}>Mark read</button> : null}
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await convertMessageToEnquiry(id);
              if (r.ok && r.data) router.push(`/admin/enquiries/${r.data.enquiryId}`);
              else if (!r.ok) setError(r.message);
            })
          }
          className={adminButton.outline}
        >
          Convert to enquiry
        </button>
        {status !== "ARCHIVED" ? <button type="button" disabled={pending} onClick={() => set("ARCHIVED")} className={adminButton.outline}>Archive</button> : null}
      </div>
      {error ? <p role="alert" className="text-xs text-[#9F3A2B]">{error}</p> : null}
    </div>
  );
}
