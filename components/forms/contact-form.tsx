"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { submitContactMessage } from "@/app/actions/leads";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { CONTACT_FORM_CATEGORIES, contactMessageSchema, type ContactMessageInput } from "@/lib/validations/leads";
import { FormError, FormSuccess, Honeypot, SelectField, SubmitButton, TextAreaField, TextField } from "./fields";

const CATEGORY_LABELS: Record<(typeof CONTACT_FORM_CATEGORIES)[number], string> = {
  GENERAL: "General enquiry",
  VEHICLE: "A vehicle in our inventory",
  CALLBACK: "Request a callback",
  INSPECTION: "Vehicle inspection",
  SOURCING: "Vehicle sourcing",
  FINANCING: "Financing",
  TRADE_IN: "Trade-in",
};

export function ContactForm({ defaultCategory }: { defaultCategory?: (typeof CONTACT_FORM_CATEGORIES)[number] }) {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const { register, handleSubmit, setError, reset, formState } = useForm<ContactMessageInput>({
    resolver: zodResolver(contactMessageSchema),
    defaultValues: { category: defaultCategory ?? "GENERAL" },
  });
  const e = formState.errors;

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await submitContactMessage(values);
      if (result.ok) setDone(result.message ?? "Thank you.");
      else {
        applyServerErrors(setError, result.fieldErrors);
        setServerError(result.message);
      }
    });
  });

  if (done) {
    return (
      <FormSuccess
        title="Message sent"
        message={done}
        onReset={() => {
          reset({ category: defaultCategory ?? "GENERAL" });
          setDone(null);
        }}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-4">
      <Honeypot {...register("website")} />
      <SelectField label="What's it about?" {...register("category")} error={e.category?.message}>
        {CONTACT_FORM_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {CATEGORY_LABELS[c]}
          </option>
        ))}
      </SelectField>
      <TextField label="Full name" autoComplete="name" required {...register("fullName")} error={e.fullName?.message} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Email" type="email" autoComplete="email" required {...register("email")} error={e.email?.message} />
        <TextField label="Phone" type="tel" autoComplete="tel" {...register("phone")} error={e.phone?.message} />
      </div>
      <TextField label="Subject" {...register("subject")} error={e.subject?.message} />
      <TextAreaField label="Message" rows={5} required {...register("message")} error={e.message?.message} />
      <FormError message={serverError} />
      <SubmitButton pending={pending}>Send message</SubmitButton>
    </form>
  );
}
