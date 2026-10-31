"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock } from "lucide-react";
import { startReservationPayment } from "@/app/actions/leads";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { reservationPaymentSchema, type ReservationPaymentInput } from "@/lib/validations/leads";
import { FormError, Honeypot, SubmitButton, TextField } from "./fields";

interface Props {
  vehicle: { id: string; title: string };
  depositLabel: string;
  holdDays: number;
  tone?: "light" | "dark";
}

/** Collects contact details, then sends the customer to Paystack's secure checkout. */
export function ReservationPaymentForm({ vehicle, depositLabel, holdDays, tone = "dark" }: Props) {
  const [pending, startTransition] = useTransition();
  const [redirecting, setRedirecting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState } = useForm<ReservationPaymentInput>({
    resolver: zodResolver(reservationPaymentSchema),
    defaultValues: { vehicleId: vehicle.id },
  });
  const e = formState.errors;
  const muted = tone === "dark" ? "text-mist" : "text-ink-body";

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await startReservationPayment(values);
      if (result.ok && result.data) {
        setRedirecting(true);
        window.location.assign(result.data.authorizationUrl);
      } else if (!result.ok) {
        applyServerErrors(setError, result.fieldErrors);
        setServerError(result.message);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-4">
      <Honeypot {...register("website")} />
      <input type="hidden" {...register("vehicleId")} />
      <div className={tone === "dark" ? "border border-graphite-line bg-graphite p-4" : "border border-ivory-line bg-ivory p-4"}>
        <p className={`text-sm ${muted}`}>Reserve online with a deposit of</p>
        <p className="text-2xl font-bold">{depositLabel}</p>
        <p className={`mt-1 text-xs ${muted}`}>
          The vehicle is held for you for {holdDays} days and the deposit goes towards the purchase price.
        </p>
      </div>
      <TextField tone={tone} label="Full name" autoComplete="name" required {...register("fullName")} error={e.fullName?.message} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField tone={tone} label="Email" type="email" autoComplete="email" required {...register("email")} error={e.email?.message} />
        <TextField tone={tone} label="Phone" type="tel" autoComplete="tel" required {...register("phone")} error={e.phone?.message} />
      </div>
      <label className={`flex items-start gap-3 text-sm ${muted}`}>
        <input type="checkbox" {...register("acceptTerms")} className="mt-0.5 h-[18px] w-[18px] accent-champagne" />
        <span>
          I understand the deposit reserves this vehicle for {holdDays} days, is deducted from the final price, and that our team
          will contact me to complete the purchase.
        </span>
      </label>
      {e.acceptTerms?.message ? <FormError tone={tone} message={e.acceptTerms.message} /> : null}
      <FormError tone={tone} message={serverError} />
      <SubmitButton tone={tone} pending={pending || redirecting}>
        {redirecting ? "Opening secure checkout…" : `Pay ${depositLabel} deposit`}
      </SubmitButton>
      <p className={`flex items-center gap-2 text-xs ${tone === "dark" ? "text-mist-dim" : "text-ink-muted"}`}>
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        Secure payment by Paystack — card, bank transfer, USSD or bank account.
      </p>
    </form>
  );
}
