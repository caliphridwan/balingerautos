"use client";

import { forwardRef, useId } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "light" | "dark";

const inputBase = {
  light:
    "w-full rounded border border-[#D4D1C8] bg-white px-3.5 text-[15px] text-obsidian placeholder:text-ink-muted focus:border-obsidian focus:outline-none aria-[invalid=true]:border-[#B4412F]",
  dark:
    "w-full rounded border border-graphite-muted bg-graphite px-3.5 text-[15px] text-white placeholder:text-mist-dim focus:border-champagne focus:outline-none aria-[invalid=true]:border-[#F2B8A8]",
};

interface FieldShellProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  tone?: Tone;
  className?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode;
}

export function FieldShell({ label, error, hint, required, tone = "light", className, children }: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className={cn("text-[11px] font-bold uppercase tracking-[0.14em]", tone === "dark" ? "text-mist" : "text-ink-muted")}
      >
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error ? (
        <p id={hintId} className={cn("text-xs", tone === "dark" ? "text-mist-dim" : "text-ink-muted")}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className={cn("text-[13px]", tone === "dark" ? "text-[#F2B8A8]" : "text-[#9F3A2B]")}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string; tone?: Tone; wrapperClassName?: string };

export const TextField = forwardRef<HTMLInputElement, InputProps>(function TextField(
  { label, error, hint, tone = "light", required, wrapperClassName, className, ...props },
  ref,
) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required} tone={tone} className={wrapperClassName}>
      {({ id, describedBy, invalid }) => (
        <input
          ref={ref}
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          aria-required={required}
          className={cn(inputBase[tone], "h-12", className)}
          {...props}
        />
      )}
    </FieldShell>
  );
});

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; hint?: string; tone?: Tone; wrapperClassName?: string };

export const SelectField = forwardRef<HTMLSelectElement, SelectProps>(function SelectField(
  { label, error, hint, tone = "light", required, wrapperClassName, className, children, ...props },
  ref,
) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required} tone={tone} className={wrapperClassName}>
      {({ id, describedBy, invalid }) => (
        <select
          ref={ref}
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          aria-required={required}
          className={cn(inputBase[tone], "h-12", tone === "dark" && "[color-scheme:dark]", className)}
          {...props}
        >
          {children}
        </select>
      )}
    </FieldShell>
  );
});

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string; hint?: string; tone?: Tone; wrapperClassName?: string };

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextAreaField(
  { label, error, hint, tone = "light", required, wrapperClassName, className, rows = 4, ...props },
  ref,
) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required} tone={tone} className={wrapperClassName}>
      {({ id, describedBy, invalid }) => (
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          aria-required={required}
          className={cn(inputBase[tone], "py-3 leading-relaxed", className)}
          {...props}
        />
      )}
    </FieldShell>
  );
});

/** Off-screen honeypot input; bots fill it, people never see it. */
export function Honeypot(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
      <label>
        Website
        <input type="text" tabIndex={-1} autoComplete="off" {...props} />
      </label>
    </div>
  );
}

export function FormError({ message, tone = "light" }: { message?: string | null; tone?: Tone }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className={cn(
        "border px-4 py-3 text-sm",
        tone === "dark" ? "border-[#7A3A30] bg-[#2A1916] text-[#F2B8A8]" : "border-[#E9C4BC] bg-[#FBF1EE] text-[#9F3A2B]",
      )}
    >
      {message}
    </p>
  );
}

export function FormSuccess({
  title,
  message,
  reference,
  tone = "light",
  onReset,
}: {
  title: string;
  message: string;
  reference?: string;
  tone?: Tone;
  onReset?: () => void;
}) {
  return (
    <div role="status" className={cn("flex flex-col items-start gap-3 p-1", tone === "dark" ? "text-white" : "text-obsidian")}>
      <CheckCircle2 aria-hidden="true" className={cn("h-8 w-8", tone === "dark" ? "text-champagne" : "text-deepgold")} strokeWidth={1.4} />
      <h3 className="font-display text-2xl">{title}</h3>
      <p className={cn("text-[15px] leading-relaxed", tone === "dark" ? "text-mist" : "text-ink-body")}>{message}</p>
      {reference && reference !== "—" ? (
        <p className="text-sm">
          Your reference: <strong className="tracking-wide">{reference}</strong>
        </p>
      ) : null}
      {onReset ? (
        <button
          type="button"
          onClick={onReset}
          className={cn("mt-1 text-xs font-bold uppercase tracking-[0.12em] underline underline-offset-4", tone === "dark" ? "text-champagne" : "text-deepgold")}
        >
          Send another request
        </button>
      ) : null}
    </div>
  );
}

export function SubmitButton({ pending, children, tone = "light", className }: { pending: boolean; children: React.ReactNode; tone?: Tone; className?: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn(
        "inline-flex min-h-[54px] w-full items-center justify-center rounded px-6 text-[13px] font-bold uppercase tracking-button transition-colors disabled:opacity-60",
        tone === "dark" ? "bg-champagne text-obsidian hover:bg-champagne-hover" : "bg-obsidian text-white hover:bg-graphite",
        className,
      )}
    >
      {pending ? "Sending…" : children}
    </button>
  );
}
