"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getTestDriveSlots, submitTestDrive } from "@/app/actions/leads";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { testDriveSchema, type TestDriveInput } from "@/lib/validations/leads";
import { FormError, FormSuccess, Honeypot, SelectField, SubmitButton, TextAreaField, TextField } from "./fields";

interface TestDriveFormProps {
  vehicle: { id: string; title: string };
  minDate: string;
  maxDate: string;
  tone?: "light" | "dark";
}

export function TestDriveForm({ vehicle, minDate, maxDate, tone = "light" }: TestDriveFormProps) {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string; message: string } | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const { register, handleSubmit, watch, setValue, setError, reset, formState } = useForm<TestDriveInput>({
    resolver: zodResolver(testDriveSchema),
    defaultValues: { vehicleId: vehicle.id },
  });
  const e = formState.errors;
  const date = watch("preferredDate");

  useEffect(() => {
    if (!date) {
      setSlots(null);
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    getTestDriveSlots(vehicle.id, date)
      .then((result) => {
        if (cancelled) return;
        setSlots(result);
        setValue("preferredTime", (result[0] ?? undefined) as TestDriveInput["preferredTime"]);
      })
      .catch(() => !cancelled && setSlots([]))
      .finally(() => !cancelled && setLoadingSlots(false));
    return () => {
      cancelled = true;
    };
  }, [date, vehicle.id, setValue]);

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await submitTestDrive(values);
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
        title="Test drive requested"
        message={done.message}
        reference={done.reference}
        onReset={() => {
          reset({ vehicleId: vehicle.id });
          setDone(null);
        }}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-4">
      <Honeypot {...register("website")} />
      <input type="hidden" {...register("vehicleId")} />
      <TextField tone={tone} label="Full name" autoComplete="name" required {...register("fullName")} error={e.fullName?.message} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField tone={tone} label="Email" type="email" autoComplete="email" required {...register("email")} error={e.email?.message} />
        <TextField tone={tone} label="Phone" type="tel" autoComplete="tel" required {...register("phone")} error={e.phone?.message} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          tone={tone}
          label="Preferred date"
          type="date"
          min={minDate}
          max={maxDate}
          required
          className={tone === "dark" ? "[color-scheme:dark]" : undefined}
          {...register("preferredDate")}
          error={e.preferredDate?.message}
        />
        <SelectField
          tone={tone}
          label="Time"
          required
          disabled={!date || loadingSlots || (slots?.length ?? 0) === 0}
          hint={!date ? "Choose a date first." : loadingSlots ? "Checking availability…" : slots && slots.length === 0 ? "No times left that day — try another date." : undefined}
          {...register("preferredTime")}
          error={e.preferredTime?.message}
        >
          {(slots ?? []).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectField>
      </div>
      <TextAreaField tone={tone} label="Anything we should know?" rows={3} {...register("message")} error={e.message?.message} />
      <FormError tone={tone} message={serverError} />
      <SubmitButton tone={tone} pending={pending}>
        Request test drive
      </SubmitButton>
      <p className={tone === "dark" ? "text-xs text-mist-dim" : "text-xs text-ink-muted"}>
        Your appointment is confirmed once our team approves it. Please bring a valid driving licence.
      </p>
    </form>
  );
}
