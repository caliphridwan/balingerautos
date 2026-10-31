"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { ActionResult } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { adminButton } from "./ui";

interface AdminFormProps {
  action: (formData: FormData) => Promise<ActionResult<unknown>>;
  children: React.ReactNode | ((errors: Record<string, string | undefined>) => React.ReactNode);
  submitLabel?: string;
  className?: string;
  resetOnSuccess?: boolean;
  /** Navigate after success (e.g. back to a list). */
  redirectTo?: string;
}

/**
 * Simple FormData form for admin screens: posts to a server action,
 * shows field errors and a status line, then refreshes server data.
 */
export function AdminForm({ action, children, submitLabel = "Save", className, resetOnSuccess, redirectTo }: AdminFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult<unknown> | null>(null);

  const errors: Record<string, string | undefined> = {};
  if (result && !result.ok && result.fieldErrors) {
    for (const [k, v] of Object.entries(result.fieldErrors) as Array<[string, string[] | undefined]>) errors[k] = v?.[0];
  }

  return (
    <form
      ref={formRef}
      className={cn("flex flex-col gap-4", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(async () => {
          const r = await action(data);
          setResult(r);
          if (r.ok) {
            if (resetOnSuccess) formRef.current?.reset();
            if (redirectTo) router.push(redirectTo);
            router.refresh();
          }
        });
      }}
    >
      {typeof children === "function" ? children(errors) : children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={adminButton.dark}>
          {pending ? "Saving…" : submitLabel}
        </button>
        {result ? (
          <span role="status" className={cn("text-sm", result.ok ? "text-[#1E4A2E]" : "text-[#9F3A2B]")}>
            {result.ok ? (result.message ?? "Saved") : result.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}

/** Labelled admin input bits used inside AdminForm. */
export function AField({ label, error, hint, children, className }: { label: string; error?: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted", className)}>
      {label}
      <span className="normal-case tracking-normal [&>*]:w-full">{children}</span>
      {hint && !error ? <span className="text-xs font-normal normal-case tracking-normal">{hint}</span> : null}
      {error ? (
        <span role="alert" className="text-xs font-normal normal-case tracking-normal text-[#9F3A2B]">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export const aInput =
  "h-10 w-full rounded border border-[#D4D1C8] bg-white px-3 text-sm font-medium text-obsidian focus:border-obsidian focus:outline-none";
export const aTextarea =
  "w-full rounded border border-[#D4D1C8] bg-white px-3 py-2 text-sm font-medium leading-relaxed text-obsidian focus:border-obsidian focus:outline-none";
