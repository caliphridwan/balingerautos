"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, X } from "lucide-react";
import { getTradeInUploadSignature, submitTradeIn } from "@/app/actions/leads";
import { applyServerErrors } from "@/lib/forms/apply-server-errors";
import { ACCEPTED_IMAGE_TYPES, uploadImage, validateImageFile, type UploadedImage } from "@/lib/forms/upload";
import { TRADE_IN_CONDITIONS, tradeInSchema, type TradeInInput } from "@/lib/validations/leads";
import { FormError, FormSuccess, Honeypot, SelectField, SubmitButton, TextAreaField, TextField } from "./fields";

const MAX_PHOTOS = 8;

interface TradeInFormProps {
  targetVehicle?: { id: string; title: string };
  currencyLabel: string;
  mileageUnit: string;
  uploadsEnabled: boolean;
}

export function TradeInForm({ targetVehicle, currencyLabel, mileageUnit, uploadsEnabled }: TradeInFormProps) {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string; message: string } | null>(null);
  const [photos, setPhotos] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, setError, reset, formState } = useForm<TradeInInput>({
    resolver: zodResolver(tradeInSchema),
    defaultValues: { targetVehicleId: targetVehicle?.id, imagePublicIds: [] },
  });
  const e = formState.errors;

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);
    const list = Array.from(files).slice(0, MAX_PHOTOS - photos.length);
    const invalid = list.map(validateImageFile).find(Boolean);
    if (invalid) {
      setUploadError(invalid);
      return;
    }
    setUploading(true);
    try {
      const sig = await getTradeInUploadSignature();
      if (!sig.ok || !sig.data) throw new Error(sig.ok ? "Upload unavailable." : sig.message);
      const uploaded: UploadedImage[] = [];
      for (const file of list) uploaded.push(await uploadImage(file, sig.data));
      setPhotos((prev) => [...prev, ...uploaded].slice(0, MAX_PHOTOS));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await submitTradeIn({ ...values, imagePublicIds: photos.map((p) => p.publicId) });
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
        title="Trade-in received"
        message={done.message}
        reference={done.reference}
        onReset={() => {
          reset({ targetVehicleId: targetVehicle?.id, imagePublicIds: [] });
          setPhotos([]);
          setDone(null);
        }}
      />
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-5">
      <Honeypot {...register("website")} />
      <input type="hidden" {...register("targetVehicleId")} />
      {targetVehicle ? (
        <p className="border border-ivory-line bg-ivory px-4 py-3 text-sm text-ink-body">
          Trading in towards: <strong className="text-obsidian">{targetVehicle.title}</strong>
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 font-display text-xl">Your current vehicle</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Make" required {...register("make")} error={e.make?.message} />
          <TextField label="Model" required {...register("model")} error={e.model?.message} />
          <TextField label="Year" inputMode="numeric" required {...register("year")} error={e.year?.message} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label={`Mileage (${mileageUnit})`} inputMode="numeric" required {...register("mileage")} error={e.mileage?.message} />
          <SelectField label="Condition" required defaultValue="" {...register("condition")} error={e.condition?.message}>
            <option value="" disabled>
              Choose…
            </option>
            {TRADE_IN_CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>
          <TextField label={`Expected value (${currencyLabel})`} inputMode="numeric" {...register("expectedValue")} error={e.expectedValue?.message} />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-display text-xl">Photos</legend>
        {uploadsEnabled ? (
          <>
            <p className="text-sm text-ink-muted">Up to {MAX_PHOTOS} photos: front, rear, sides, interior and dashboard (mileage) help most.</p>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((p) => (
                <li key={p.publicId} className="relative aspect-[4/3] overflow-hidden bg-ivory-soft">
                  <Image src={p.url} alt="Uploaded trade-in photo" fill sizes="160px" className="object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((prev) => prev.filter((x) => x.publicId !== p.publicId))}
                    aria-label="Remove photo"
                    className="absolute right-1 top-1 inline-flex h-8 w-8 items-center justify-center bg-obsidian/80 text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
              {photos.length < MAX_PHOTOS ? (
                <li>
                  <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-[#C9C5BA] bg-white text-xs font-semibold text-ink-muted hover:border-obsidian">
                    <ImagePlus className="h-5 w-5" strokeWidth={1.4} aria-hidden="true" />
                    {uploading ? "Uploading…" : "Add photos"}
                    <input
                      ref={fileInput}
                      type="file"
                      accept={ACCEPTED_IMAGE_TYPES.join(",")}
                      multiple
                      disabled={uploading}
                      onChange={(ev) => void onFiles(ev.target.files)}
                      className="sr-only"
                    />
                  </label>
                </li>
              ) : null}
            </ul>
            <FormError message={uploadError ?? e.imagePublicIds?.message} />
          </>
        ) : (
          <p className="text-sm text-ink-muted">Photo upload isn't available at the moment. Our team may ask for photos when they contact you.</p>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 font-display text-xl">Your details</legend>
        <TextField label="Full name" autoComplete="name" required {...register("fullName")} error={e.fullName?.message} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Email" type="email" autoComplete="email" required {...register("email")} error={e.email?.message} />
          <TextField label="Phone" type="tel" autoComplete="tel" required {...register("phone")} error={e.phone?.message} />
        </div>
        <TextAreaField label="Anything else? (service history, modifications, finance outstanding)" rows={3} {...register("message")} error={e.message?.message} />
      </fieldset>

      <FormError message={serverError} />
      <SubmitButton pending={pending || uploading}>Submit trade-in</SubmitButton>
    </form>
  );
}
