"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm, type DefaultValues, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveVehicle } from "@/app/admin/actions/vehicles";
import { ImageManager } from "@/components/admin/image-manager";
import { adminButton } from "@/components/admin/ui";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { cn } from "@/lib/utils";
import {
  BODY_TYPE_VALUES,
  CONDITION_VALUES,
  DRIVETRAIN_VALUES,
  FEATURE_GROUP_VALUES,
  FUEL_VALUES,
  STATUS_VALUES,
  TRANSMISSION_VALUES,
  VEHICLE_FORM_STEPS,
  vehicleSchema,
  type VehicleFormInput,
} from "@/lib/validations/vehicle";

const LABELS: Record<string, string> = {
  SUV: "SUV", SEDAN: "Sedan", COUPE: "Coupe", CONVERTIBLE: "Convertible", HATCHBACK: "Hatchback", WAGON: "Wagon", PICKUP: "Pickup", CROSSOVER: "Crossover", VAN: "Van",
  NEW: "New", USED: "Pre-owned", CERTIFIED_PRE_OWNED: "Certified pre-owned",
  AVAILABLE: "Available", RESERVED: "Reserved", SOLD: "Sold", ARCHIVED: "Archived",
  PETROL: "Petrol", DIESEL: "Diesel", HYBRID: "Hybrid", PLUG_IN_HYBRID: "Plug-in hybrid", ELECTRIC: "Electric",
  AUTOMATIC: "Automatic", MANUAL: "Manual", SEMI_AUTOMATIC: "Semi-automatic", CVT: "CVT",
  FWD: "Front-wheel drive", RWD: "Rear-wheel drive", AWD: "All-wheel drive", FOUR_WD: "Four-wheel drive",
  KEY: "Key features", SAFETY: "Safety", COMFORT: "Comfort", TECHNOLOGY: "Technology",
};

const input = "h-11 w-full rounded border border-[#D4D1C8] bg-white px-3 text-sm font-medium focus:border-obsidian focus:outline-none aria-[invalid=true]:border-[#B4412F]";
const area = "w-full rounded border border-[#D4D1C8] bg-white px-3 py-2.5 text-sm leading-relaxed focus:border-obsidian focus:outline-none";

function Field({ label, error, hint, children, className }: { label: string; error?: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">{label}</span>
      {children}
      {hint && !error ? <span className="text-xs text-ink-muted">{hint}</span> : null}
      {error ? <span role="alert" className="text-xs text-[#9F3A2B]">{error}</span> : null}
    </label>
  );
}

function Check({ label, hint, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-1 text-sm">
      <input type="checkbox" className="mt-0.5 h-[18px] w-[18px] accent-obsidian" {...props} />
      <span className="flex flex-col">
        <span className="font-semibold">{label}</span>
        {hint ? <span className="text-xs text-ink-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

interface VehicleFormProps {
  id?: string;
  /** Raw initial values (strings allowed for empty numeric inputs). */
  initial: Partial<Record<keyof VehicleFormInput, unknown>>;
  categories: Array<{ id: string; name: string }>;
  publicUrl?: string;
  uploadsEnabled: boolean;
}

export function VehicleForm({ id, initial, categories, publicUrl, uploadsEnabled }: VehicleFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const initialFeatures = (initial.features ?? []) as Array<{ group: string; label: string }>;
  const [featureText, setFeatureText] = useState<Record<string, string>>(() =>
    Object.fromEntries(FEATURE_GROUP_VALUES.map((g) => [g, initialFeatures.filter((f) => f.group === g).map((f) => f.label).join("\n")])),
  );

  const form = useForm<VehicleFormInput>({ resolver: zodResolver(vehicleSchema), defaultValues: initial as DefaultValues<VehicleFormInput>, mode: "onBlur" });
  const { register, control, handleSubmit, trigger, formState } = form;
  const e = formState.errors as Record<string, { message?: string } | undefined>;
  const err = (name: string) => e[name]?.message;
  const current = VEHICLE_FORM_STEPS[step]!;
  const last = step === VEHICLE_FORM_STEPS.length - 1;

  function featuresFromText() {
    return FEATURE_GROUP_VALUES.flatMap((group) =>
      (featureText[group] ?? "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((label) => ({ group, label: label.slice(0, 120) })),
    );
  }

  async function next() {
    const ok = await trigger(current.fields as unknown as Array<FieldPath<VehicleFormInput>>);
    if (ok) setStep((s) => Math.min(s + 1, VEHICLE_FORM_STEPS.length - 1));
  }

  const onSubmit = handleSubmit(
    (values) => {
      setStatus(null);
      startTransition(async () => {
        const result = await saveVehicle({ ...values, features: featuresFromText() }, id);
        if (result.ok) {
          setStatus({ ok: true, text: result.message ?? "Saved." });
          if (!id && result.data) router.push(`/admin/vehicles/${result.data.id}?created=1`);
          else router.refresh();
        } else {
          applyServerErrors(form.setError, result.fieldErrors);
          setStatus({ ok: false, text: result.message });
          const badStep = VEHICLE_FORM_STEPS.findIndex((s) => (s.fields as readonly string[]).some((f) => result.fieldErrors?.[f]));
          if (badStep >= 0) setStep(badStep);
        }
      });
    },
    (errors) => {
      const badStep = VEHICLE_FORM_STEPS.findIndex((s) => (s.fields as readonly string[]).some((f) => f in errors));
      if (badStep >= 0) setStep(badStep);
      setStatus({ ok: false, text: "Please fix the highlighted fields." });
    },
  );

  return (
    <form onSubmit={(ev) => void onSubmit(ev)} noValidate className="flex flex-col gap-6">
      <ol className="flex flex-wrap gap-2" aria-label="Form steps">
        {VEHICLE_FORM_STEPS.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => setStep(i)}
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "min-h-[40px] border px-3.5 text-xs font-bold uppercase tracking-[0.08em]",
                i === step ? "border-obsidian bg-obsidian text-white" : "border-[#D4D1C8] bg-white hover:border-obsidian",
                (s.fields as readonly string[]).some((f) => e[f]) && i !== step && "border-[#B4412F] text-[#9F3A2B]",
              )}
            >
              {i + 1}. {s.label}
            </button>
          </li>
        ))}
      </ol>

      <section className="border border-ivory-line bg-white p-6">
        <h2 className="mb-5 font-display text-2xl">{current.label}</h2>

        <div className={step === 0 ? "grid gap-5 md:grid-cols-2" : "hidden"}>
          <Field label="Stock number *" error={err("stockNumber")}>
            <input className={input} {...register("stockNumber")} aria-invalid={Boolean(err("stockNumber"))} />
          </Field>
          <Field label="Year *" error={err("year")}>
            <input className={input} inputMode="numeric" {...register("year")} />
          </Field>
          <Field label="Make *" error={err("make")}>
            <input className={input} {...register("make")} />
          </Field>
          <Field label="Model *" error={err("model")}>
            <input className={input} {...register("model")} />
          </Field>
          <Field label="Trim" error={err("trim")}>
            <input className={input} {...register("trim")} />
          </Field>
          <Field label="Body type *" error={err("bodyType")}>
            <select className={input} {...register("bodyType")}>
              {BODY_TYPE_VALUES.map((v) => <option key={v} value={v}>{LABELS[v]}</option>)}
            </select>
          </Field>
          <Field label="Condition *" error={err("condition")}>
            <select className={input} {...register("condition")}>
              {CONDITION_VALUES.map((v) => <option key={v} value={v}>{LABELS[v]}</option>)}
            </select>
          </Field>
          <fieldset className="md:col-span-2">
            <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">Categories</legend>
            <Controller
              control={control}
              name="categoryIds"
              render={({ field }) => {
                const selected = (field.value ?? []) as string[];
                return (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => {
                      const on = selected.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => field.onChange(on ? selected.filter((x) => x !== c.id) : [...selected, c.id])}
                          className={cn("min-h-[38px] border px-3 text-sm font-semibold", on ? "border-obsidian bg-obsidian text-white" : "border-[#D4D1C8] bg-white")}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                );
              }}
            />
          </fieldset>
        </div>

        <div className={step === 1 ? "grid gap-5 md:grid-cols-2" : "hidden"}>
          <Field label="Price *" error={err("price")} hint="Whole naira amount, no symbols or commas, e.g. 95000000.">
            <input className={input} inputMode="decimal" {...register("price")} />
          </Field>
          <Field label="Currency *" error={err("currency")} hint="NGN for naira (3-letter code).">
            <input className={input} maxLength={3} {...register("currency")} />
          </Field>
          <Field label="Availability *" error={err("status")}>
            <select className={input} {...register("status")}>
              {STATUS_VALUES.map((v) => <option key={v} value={v}>{LABELS[v]}</option>)}
            </select>
          </Field>
          <div className="flex flex-col gap-1">
            <Check label="Price on request" hint="Hide the price publicly." {...register("priceOnRequest")} />
            <Check label="Featured" hint="Show in the homepage Featured Collection." {...register("isFeatured")} />
            <Check label="Published" hint="Visible on the website. Leave unticked to save as a draft." {...register("isPublished")} />
          </div>
        </div>

        <div className={step === 2 ? "grid gap-5 md:grid-cols-3" : "hidden"}>
          <Field label="Mileage *" error={err("mileage")}>
            <input className={input} inputMode="numeric" {...register("mileage")} />
          </Field>
          <Field label="Transmission *" error={err("transmission")}>
            <select className={input} {...register("transmission")}>
              {TRANSMISSION_VALUES.map((v) => <option key={v} value={v}>{LABELS[v]}</option>)}
            </select>
          </Field>
          <Field label="Fuel type *" error={err("fuelType")}>
            <select className={input} {...register("fuelType")}>
              {FUEL_VALUES.map((v) => <option key={v} value={v}>{LABELS[v]}</option>)}
            </select>
          </Field>
          <Field label="Drivetrain" error={err("drivetrain")}>
            <select className={input} {...register("drivetrain")}>
              <option value="">—</option>
              {DRIVETRAIN_VALUES.map((v) => <option key={v} value={v}>{LABELS[v]}</option>)}
            </select>
          </Field>
          <Field label="Engine capacity (cc)" error={err("engineCapacityCc")}>
            <input className={input} inputMode="numeric" {...register("engineCapacityCc")} />
          </Field>
          <Field label="Horsepower" error={err("horsepower")}>
            <input className={input} inputMode="numeric" {...register("horsepower")} />
          </Field>
          <Field label="Doors" error={err("doors")}>
            <input className={input} inputMode="numeric" {...register("doors")} />
          </Field>
          <Field label="Seats" error={err("seats")}>
            <input className={input} inputMode="numeric" {...register("seats")} />
          </Field>
          <Field label="Exterior colour *" error={err("exteriorColour")} hint="Used for the colour filter, e.g. Black, White, Grey.">
            <input className={input} {...register("exteriorColour")} />
          </Field>
          <Field label="Interior colour" error={err("interiorColour")}>
            <input className={input} {...register("interiorColour")} />
          </Field>
          <Field label="VIN" error={err("vin")}>
            <input className={input} {...register("vin")} />
          </Field>
          <div className="flex items-end">
            <Check label="Show VIN publicly" {...register("showVin")} />
          </div>
        </div>

        <div className={step === 3 ? "grid gap-5" : "hidden"}>
          <Field label="Description" error={err("description")}>
            <textarea rows={7} className={area} {...register("description")} />
          </Field>
          <div className="grid gap-5 md:grid-cols-2">
            {FEATURE_GROUP_VALUES.map((g) => (
              <Field key={g} label={LABELS[g] ?? g} hint="One per line.">
                <textarea
                  rows={5}
                  className={area}
                  value={featureText[g] ?? ""}
                  onChange={(ev) => setFeatureText((t) => ({ ...t, [g]: ev.target.value }))}
                />
              </Field>
            ))}
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <Field label="Inspection date" error={err("inspectedAt")}>
              <input type="date" className={input} {...register("inspectedAt")} />
            </Field>
            <Field label="Service history" error={err("serviceHistory")} hint="e.g. Full dealer history">
              <input className={input} {...register("serviceHistory")} />
            </Field>
            <Field label="Previous owners" error={err("previousOwners")}>
              <input className={input} inputMode="numeric" {...register("previousOwners")} />
            </Field>
          </div>
          <Field label="Inspection notes" error={err("inspectionNotes")}>
            <textarea rows={4} className={area} {...register("inspectionNotes")} />
          </Field>
        </div>

        <div className={step === 4 ? "grid gap-5" : "hidden"}>
          {uploadsEnabled ? (
            <Controller
              control={control}
              name="images"
              render={({ field }) => (
                <ImageManager
                  value={(field.value ?? []) as Array<{ id?: string; publicId?: string; url: string; alt?: string }>}
                  onChange={field.onChange}
                />
              )}
            />
          ) : (
            <p className="border border-[#E2CFA9] bg-[#F3E9D6] px-4 py-3 text-sm text-[#5C431B]">
              Photo uploads need Cloudinary. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to your environment.
            </p>
          )}
          {err("images") ? <p role="alert" className="text-sm text-[#9F3A2B]">{err("images")}</p> : null}
          <Field label="Walkaround video link" error={err("videoUrl")} hint="YouTube or Vimeo https:// link.">
            <input className={input} {...register("videoUrl")} />
          </Field>
        </div>

        <div className={step === 5 ? "grid gap-5" : "hidden"}>
          <Field label="URL slug" error={err("slug")} hint={publicUrl ? `Current: ${publicUrl}` : "Leave blank to generate from the year, make and model."}>
            <input className={input} {...register("slug")} />
          </Field>
          <Field label="SEO title" error={err("metaTitle")} hint="Up to 70 characters. Defaults to the vehicle name.">
            <input className={input} maxLength={70} {...register("metaTitle")} />
          </Field>
          <Field label="SEO description" error={err("metaDescription")} hint="Up to 170 characters. Defaults to a summary of key specs.">
            <textarea rows={3} maxLength={170} className={area} {...register("metaDescription")} />
          </Field>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        {step > 0 ? (
          <button type="button" onClick={() => setStep((s) => s - 1)} className={adminButton.outline}>
            Back
          </button>
        ) : null}
        {!last ? (
          <button type="button" onClick={() => void next()} className={adminButton.outline}>
            Next: {VEHICLE_FORM_STEPS[step + 1]?.label}
          </button>
        ) : null}
        <button type="submit" disabled={pending} className={adminButton.dark}>
          {pending ? "Saving…" : id ? "Save changes" : "Create vehicle"}
        </button>
        {publicUrl ? (
          <Link href={publicUrl} target="_blank" className="text-xs font-bold uppercase tracking-[0.08em] underline underline-offset-4">
            View on site
          </Link>
        ) : null}
        {status ? (
          <span role="status" className={cn("text-sm", status.ok ? "text-[#1E4A2E]" : "text-[#9F3A2B]")}>
            {status.text}
          </span>
        ) : null}
      </div>
    </form>
  );
}
