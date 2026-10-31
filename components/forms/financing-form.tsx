"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { submitFinancing } from "@/app/actions/leads";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { EMPLOYMENT_STATUSES, FINANCE_TERMS, financingSchema, type FinancingInput } from "@/lib/validations/leads";
import { FormError, FormSuccess, Honeypot, SelectField, SubmitButton, TextAreaField, TextField } from "./fields";

interface VehicleOption {
  id: string;
  label: string;
  priceLabel: string;
}

interface FinancingFormProps {
  /** Pre-selected vehicle (vehicle page). */
  vehicle?: VehicleOption;
  /** Choices for the standalone financing page. */
  vehicles?: VehicleOption[];
  currencyLabel: string;
  tone?: "light" | "dark";
}

export function FinancingForm({ vehicle, vehicles, currencyLabel, tone = "light" }: FinancingFormProps) {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string; message: string } | null>(null);

  const { register, handleSubmit, watch, setError, reset, formState } = useForm<FinancingInput>({
    resolver: zodResolver(financingSchema),
    defaultValues: { vehicleId: vehicle?.id, termMonths: "36" },
  });
  const e = formState.errors;
  const selectedId = watch("vehicleId");
  const selected = vehicle ?? vehicles?.find((v) => v.id === selectedId);

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    const payload = { ...values, vehicleId: values.vehicleId || undefined };
    startTransition(async () => {
      const result = await submitFinancing(payload);
      if (result.ok) setDone({ reference: result.data?.reference ?? "", message: result.message ?? "Thank you." });
      else {
        applyServerErrors(setError, result.fieldErrors);
        setServerError(result.message);
      }
    });
  });

  if (done) {
    return (
      <FormSuccess
        tone={tone}
        title="Financing enquiry received"
        message={done.message}
        reference={done.reference}
        onReset={() => {
          reset({ vehicleId: vehicle?.id, termMonths: "36" });
          setDone(null);
        }}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-4">
      <Honeypot {...register("website")} />
      {vehicle ? (
        <input type="hidden" {...register("vehicleId")} />
      ) : vehicles && vehicles.length > 0 ? (
        <SelectField tone={tone} label="Vehicle" {...register("vehicleId")} hint="Optional — choose from our inventory.">
          <option value="">Not decided yet</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label} — {v.priceLabel}
            </option>
          ))}
        </SelectField>
      ) : null}
      {selected ? (
        <p className={tone === "dark" ? "text-sm text-mist" : "text-sm text-ink-body"}>
          Vehicle price: <strong className={tone === "dark" ? "text-white" : "text-obsidian"}>{selected.priceLabel}</strong>
        </p>
      ) : (
        <TextField
          tone={tone}
          label={`Approximate vehicle price (${currencyLabel})`}
          inputMode="numeric"
          {...register("vehiclePrice")}
          error={e.vehiclePrice?.message}
        />
      )}
      <TextField tone={tone} label="Full name" autoComplete="name" required {...register("fullName")} error={e.fullName?.message} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField tone={tone} label="Email" type="email" autoComplete="email" required {...register("email")} error={e.email?.message} />
        <TextField tone={tone} label="Phone" type="tel" autoComplete="tel" required {...register("phone")} error={e.phone?.message} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          tone={tone}
          label={`Proposed deposit (${currencyLabel})`}
          inputMode="numeric"
          {...register("proposedDeposit")}
          error={e.proposedDeposit?.message}
        />
        <SelectField tone={tone} label="Repayment period" {...register("termMonths")} error={e.termMonths?.message}>
          {FINANCE_TERMS.map((t) => (
            <option key={t} value={t}>
              {t} months
            </option>
          ))}
        </SelectField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField tone={tone} label="Employment" {...register("employmentStatus")} error={e.employmentStatus?.message}>
          <option value="">Prefer not to say</option>
          {EMPLOYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectField>
        <TextField tone={tone} label="Employer / business" {...register("employerName")} error={e.employerName?.message} />
      </div>
      <TextAreaField tone={tone} label="Additional details" rows={3} {...register("additionalDetails")} error={e.additionalDetails?.message} />
      <FormError tone={tone} message={serverError} />
      <SubmitButton tone={tone} pending={pending}>
        Submit financing enquiry
      </SubmitButton>
      <p className={tone === "dark" ? "text-xs leading-relaxed text-mist-dim" : "text-xs leading-relaxed text-ink-muted"}>
        This is an enquiry, not a credit application. Approval, rates and terms are decided by our lending partners, and
        submitting does not guarantee finance.
      </p>
    </form>
  );
}
