"use client";

import { useRef, useState, useTransition } from "react";
import { importVehiclesCsv, type ImportRowResult } from "@/app/admin/actions/vehicles";
import { Badge, Card, adminButton } from "@/components/admin/ui";

const tone = { create: "green", update: "blue", skip: "muted", error: "red" } as const;

export function ImportForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [results, setResults] = useState<ImportRowResult[] | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [committed, setCommitted] = useState(false);

  function submit(commit: boolean) {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    data.set("commit", String(commit));
    startTransition(async () => {
      const r = await importVehiclesCsv(data);
      setMessage({ ok: r.ok, text: r.ok ? (r.message ?? "") : r.message });
      if (r.ok && r.data) {
        setResults(r.data.results);
        setCommitted(r.data.committed);
      }
    });
  }

  const counts = (results ?? []).reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.outcome]: (acc[r.outcome] ?? 0) + 1 }), {});
  const importable = (counts.create ?? 0) + (counts.update ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <Card title="1. Choose file">
        <form ref={formRef} onSubmit={(e) => { e.preventDefault(); submit(false); }} className="flex flex-col gap-4">
          <input
            type="file"
            name="file"
            accept=".csv,text/csv"
            required
            onChange={() => {
              setResults(null);
              setCommitted(false);
              setMessage(null);
            }}
            className="text-sm file:mr-4 file:border-0 file:bg-obsidian file:px-4 file:py-2.5 file:text-xs file:font-bold file:uppercase file:text-white"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="updateExisting" className="h-[18px] w-[18px] accent-obsidian" />
            Update vehicles whose stock number already exists (otherwise they're skipped)
          </label>
          <div>
            <button type="submit" disabled={pending} className={adminButton.dark}>
              {pending ? "Checking…" : "Preview import"}
            </button>
          </div>
        </form>
      </Card>

      {message ? (
        <p role="status" className={message.ok ? "text-sm text-[#1E4A2E]" : "text-sm text-[#9F3A2B]"}>
          {message.text}
        </p>
      ) : null}

      {results ? (
        <Card
          title={committed ? "Import complete" : "2. Review and confirm"}
          actions={
            !committed && importable > 0 ? (
              <button type="button" disabled={pending} onClick={() => submit(true)} className={adminButton.gold}>
                {pending ? "Importing…" : `Import ${importable} ${importable === 1 ? "vehicle" : "vehicles"}`}
              </button>
            ) : null
          }
          padded={false}
        >
          <p className="flex flex-wrap gap-3 px-5 py-3 text-sm">
            <span>New: {counts.create ?? 0}</span>
            <span>Update: {counts.update ?? 0}</span>
            <span>Skipped: {counts.skip ?? 0}</span>
            <span>Errors: {counts.error ?? 0}</span>
          </p>
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                  <th className="px-5 py-2">Row</th>
                  <th className="px-5 py-2">Stock</th>
                  <th className="px-5 py-2">Outcome</th>
                  <th className="px-5 py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.row} className="border-t border-ivory-soft">
                    <td className="px-5 py-2">{r.row}</td>
                    <td className="px-5 py-2 font-mono text-xs">{r.stockNumber || "—"}</td>
                    <td className="px-5 py-2"><Badge tone={tone[r.outcome]}>{r.outcome}</Badge></td>
                    <td className="px-5 py-2 text-ink-muted">{r.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
