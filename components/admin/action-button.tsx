"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { adminButton } from "./ui";

interface ActionButtonProps {
  action: () => Promise<ActionResult<unknown>>;
  children: React.ReactNode;
  variant?: keyof typeof adminButton;
  /** Requires a second click to run (destructive actions). */
  confirm?: string;
  className?: string;
  onDone?: () => void;
}

/** Runs a bound server action, shows the result, and refreshes the page data. */
export function ActionButton({ action, children, variant = "outline", confirm, className, onDone }: ActionButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [armed, setArmed] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function run() {
    if (confirm && !armed) {
      setArmed(true);
      window.setTimeout(() => setArmed(false), 4000);
      return;
    }
    setArmed(false);
    startTransition(async () => {
      const result = await action();
      setMessage({ ok: result.ok, text: result.ok ? (result.message ?? "Done") : result.message });
      if (result.ok) {
        router.refresh();
        onDone?.();
      }
      window.setTimeout(() => setMessage(null), 3500);
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={run} disabled={pending} className={cn(adminButton[armed ? "danger" : variant], className)}>
        {pending ? "Working…" : armed ? (confirm ?? "Confirm") : children}
      </button>
      {message ? (
        <span role="status" className={cn("text-xs", message.ok ? "text-[#1E4A2E]" : "text-[#9F3A2B]")}>
          {message.text}
        </span>
      ) : null}
    </span>
  );
}
