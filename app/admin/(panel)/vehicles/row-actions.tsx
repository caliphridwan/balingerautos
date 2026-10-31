"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteVehicle, setVehicleFeatured, setVehiclePublished, setVehicleStatus } from "@/app/admin/actions/vehicles";
import type { ActionResult } from "@/lib/actions";

type Status = "AVAILABLE" | "RESERVED" | "SOLD" | "ARCHIVED";

export function VehicleRowActions(props: { id: string; slug: string; status: Status; isFeatured: boolean; isPublished: boolean; canDelete: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function run(fn: () => Promise<ActionResult>) {
    startTransition(async () => {
      const r = await fn();
      setMessage(r.ok ? (r.message ?? null) : r.message);
      router.refresh();
      window.setTimeout(() => setMessage(null), 3500);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <label className="sr-only" htmlFor={`status-${props.id}`}>Status</label>
        <select
          id={`status-${props.id}`}
          value={props.status}
          disabled={pending}
          onChange={(e) => run(() => setVehicleStatus(props.id, e.target.value as Status))}
          className="h-9 rounded border border-[#D4D1C8] bg-white px-2 text-xs font-semibold"
        >
          <option value="AVAILABLE">Available</option>
          <option value="RESERVED">Reserved</option>
          <option value="SOLD">Sold</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button type="button" disabled={pending} onClick={() => run(() => setVehiclePublished(props.id, !props.isPublished))} className="h-9 border border-[#D4D1C8] px-2.5 text-xs font-semibold hover:border-obsidian">
          {props.isPublished ? "Unpublish" : "Publish"}
        </button>
        <button type="button" disabled={pending} onClick={() => run(() => setVehicleFeatured(props.id, !props.isFeatured))} className="h-9 border border-[#D4D1C8] px-2.5 text-xs font-semibold hover:border-obsidian">
          {props.isFeatured ? "Unfeature" : "Feature"}
        </button>
        <Link href={`/admin/vehicles/${props.id}`} className="inline-flex h-9 items-center border border-obsidian bg-obsidian px-2.5 text-xs font-semibold text-white">
          Edit
        </Link>
        {props.canDelete ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                window.setTimeout(() => setConfirmDelete(false), 4000);
                return;
              }
              run(() => deleteVehicle(props.id));
            }}
            className="h-9 border border-[#E6C2BA] px-2.5 text-xs font-semibold text-[#7A2A1E] hover:bg-[#F6E3DF]"
          >
            {confirmDelete ? "Confirm delete" : "Delete"}
          </button>
        ) : null}
      </div>
      {message ? <span role="status" className="text-xs text-ink-muted">{message}</span> : null}
    </div>
  );
}
