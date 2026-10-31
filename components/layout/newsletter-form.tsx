"use client";

import { useFormState, useFormStatus } from "react-dom";
import { subscribeToNewsletter, type NewsletterState } from "@/app/actions/newsletter";
import { cn } from "@/lib/utils";

const initialState: NewsletterState = { status: "idle", message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 bg-champagne px-5 text-xs font-bold uppercase tracking-[0.12em] text-obsidian transition-colors hover:bg-champagne-hover disabled:opacity-60"
    >
      {pending ? "Joining…" : "Join"}
    </button>
  );
}

export function NewsletterForm() {
  const [state, formAction] = useFormState(subscribeToNewsletter, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <label htmlFor="newsletter-email" className="text-sm text-mist">
        Join our list for early access to new arrivals.
      </label>
      <div className="flex h-12 border border-graphite-muted focus-within:border-champagne">
        <input
          id="newsletter-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="Email address"
          aria-describedby="newsletter-status"
          className="min-w-0 flex-1 bg-transparent px-4 text-sm text-white placeholder:text-mist-dim focus:outline-none"
        />
        <SubmitButton />
      </div>
      {/* Honeypot, hidden from people and assistive tech */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Company
          <input name="company" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <input type="hidden" name="source" value="footer" />
      <p
        id="newsletter-status"
        role="status"
        className={cn("min-h-[1.25rem] text-[13px]", state.status === "error" ? "text-[#F2B8A8]" : "text-champagne-light")}
      >
        {state.message}
      </p>
    </form>
  );
}
