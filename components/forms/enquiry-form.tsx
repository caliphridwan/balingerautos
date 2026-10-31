"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { submitEnquiry } from "@/app/actions/leads";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { enquirySchema, type EnquiryInput, SIMPLE_ENQUIRY_TYPES } from "@/lib/validations/leads";
import { FormError, FormSuccess, Honeypot, SelectField, SubmitButton, TextAreaField, TextField } from "./fields";

type SimpleType = (typeof SIMPLE_ENQUIRY_TYPES)[number];

const TYPE_LABELS: Record<SimpleType, string> = {
  VEHICLE: "Ask about this vehicle",
  GENERAL: "General enquiry",
  CALLBACK: "Request a callback",
  INSPECTION: "Book an inspection",
  RESERVATION: "Request a reservation",
  SOURCING: "Source a vehicle for me",
};

interface EnquiryFormProps {
  defaultType: SimpleType;
  /** Types the visitor may switch between; omit to hide the selector. */
  types?: SimpleType[];
  vehicle?: { id: string; title: string; stockNumber: string };
  source?: string;
  tone?: "light" | "dark";
  submitLabel?: string;
  defaultMessage?: string;
}

export function EnquiryForm({ defaultType, types, vehicle, source, tone = "light", submitLabel, defaultMessage }: EnquiryFormProps) {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string; message: string } | null>(null);

  const form = useForm<EnquiryInput>({
    resolver: zodResolver(enquirySchema),
    defaultValues: {
      type: defaultType,
      vehicleId: vehicle?.id,
      message: defaultMessage ?? (vehicle ? `I'm interested in the ${vehicle.title} (${vehicle.stockNumber}).` : ""),
      source,
      preferredContact: "email",
    },
  });
  const { register, handleSubmit, watch, setError, reset, formState } = form;
  const type = watch("type");
  const e = formState.errors;

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await submitEnquiry(values);
      if (result.ok) {
        setDone({ reference: result.data?.reference ?? "", message: result.message ?? "Thank you." });
      } else {
        applyServerErrors(setError, result.fieldErrors);
        setServerError(result.message);
      }
    });
  });

  if (done) {
    return (
      <FormSuccess
        tone={tone}
        title="Request received"
        message={done.message}
        reference={done.reference}
        onReset={() => {
          reset();
          setDone(null);
        }}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-4">
      <Honeypot {...register("website")} />
      <input type="hidden" {...register("vehicleId")} />
      <input type="hidden" {...register("source")} />
      {types && types.length > 1 ? (
        <SelectField tone={tone} label="I'd like to" {...register("type")} error={e.type?.message}>
          {types.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </SelectField>
      ) : (
        <input type="hidden" {...register("type")} />
      )}
      <TextField tone={tone} label="Full name" autoComplete="name" required {...register("fullName")} error={e.fullName?.message} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField tone={tone} label="Email" type="email" autoComplete="email" required {...register("email")} error={e.email?.message} />
        <TextField
          tone={tone}
          label="Phone"
          type="tel"
          autoComplete="tel"
          required={type === "CALLBACK"}
          {...register("phone")}
          error={e.phone?.message}
        />
      </div>
      {type === "SOURCING" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField tone={tone} label="Make" {...register("sourcingMake")} error={e.sourcingMake?.message} />
          <TextField tone={tone} label="Model" {...register("sourcingModel")} error={e.sourcingModel?.message} />
          <TextField tone={tone} label="Budget" {...register("sourcingBudget")} error={e.sourcingBudget?.message} />
        </div>
      ) : null}
      <SelectField tone={tone} label="Preferred contact" {...register("preferredContact")}>
        <option value="email">Email</option>
        <option value="phone">Phone call</option>
        <option value="whatsapp">WhatsApp</option>
      </SelectField>
      <TextAreaField tone={tone} label="Message" {...register("message")} error={e.message?.message} />
      {e.vehicleId?.message ? <FormError tone={tone} message={e.vehicleId.message} /> : null}
      <FormError tone={tone} message={serverError} />
      <SubmitButton tone={tone} pending={pending}>
        {submitLabel ?? (type ? TYPE_LABELS[type] : "Send enquiry")}
      </SubmitButton>
    </form>
  );
}
