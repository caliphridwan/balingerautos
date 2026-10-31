"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Star, X } from "lucide-react";
import { getVehicleUploadSignature } from "@/app/admin/actions/vehicles";
import { ACCEPTED_IMAGE_TYPES, uploadImage, validateImageFile } from "@/lib/forms/upload";

export interface ManagedImage {
  id?: string;
  publicId?: string;
  url: string;
  alt?: string;
}

interface ImageManagerProps {
  value: ManagedImage[];
  onChange: (next: ManagedImage[]) => void;
  max?: number;
  scope?: "vehicles" | "content";
  /** Single-image mode for hero/about images. */
  single?: boolean;
}

/** Upload (direct to Cloudinary), reorder, caption and remove images. First image = cover. */
export function ImageManager({ value, onChange, max = 40, scope = "vehicles", single }: ImageManagerProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const limit = single ? 1 : max;

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = Array.from(files).slice(0, Math.max(0, limit - (single ? 0 : value.length)));
    const invalid = list.map(validateImageFile).find(Boolean);
    if (invalid) {
      setError(invalid);
      return;
    }
    try {
      const sig = await getVehicleUploadSignature(scope);
      if (!sig.ok || !sig.data) throw new Error(sig.ok ? "Uploads unavailable." : sig.message);
      const uploaded: ManagedImage[] = [];
      for (const [i, file] of list.entries()) {
        setBusy(`Uploading ${i + 1} of ${list.length}…`);
        const img = await uploadImage(file, sig.data);
        uploaded.push({ publicId: img.publicId, url: img.url, alt: "" });
      }
      onChange(single ? uploaded.slice(0, 1) : [...value, ...uploaded].slice(0, limit));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  }

  function move(index: number, delta: number) {
    const next = [...value];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    if (item) next.splice(target, 0, item);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 ? (
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {value.map((img, i) => (
            <li key={img.id ?? img.publicId ?? img.url} className="flex flex-col border border-ivory-line bg-white">
              <div className="relative aspect-[16/10] bg-graphite">
                <Image src={img.url} alt={img.alt || `Photo ${i + 1}`} fill sizes="300px" className="object-cover" />
                {i === 0 && !single ? (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 bg-champagne px-2 py-0.5 text-[10px] font-bold uppercase text-obsidian">
                    <Star className="h-3 w-3" aria-hidden="true" /> Cover
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-1 p-2">
                <label className="sr-only" htmlFor={`alt-${i}`}>Description for photo {i + 1}</label>
                <input
                  id={`alt-${i}`}
                  value={img.alt ?? ""}
                  onChange={(e) => onChange(value.map((v, j) => (j === i ? { ...v, alt: e.target.value.slice(0, 200) } : v)))}
                  placeholder="Alt text (e.g. front three-quarter view)"
                  className="h-9 min-w-0 flex-1 border border-[#D4D1C8] px-2 text-xs"
                />
                {!single ? (
                  <>
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move photo ${i + 1} earlier`} className="inline-flex h-9 w-9 items-center justify-center border border-[#D4D1C8] disabled:opacity-30">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label={`Move photo ${i + 1} later`} className="inline-flex h-9 w-9 items-center justify-center border border-[#D4D1C8] disabled:opacity-30">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </>
                ) : null}
                <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Remove photo ${i + 1}`} className="inline-flex h-9 w-9 items-center justify-center border border-[#E6C2BA] text-[#7A2A1E]">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
      {value.length < limit || single ? (
        <label className="flex min-h-[110px] cursor-pointer flex-col items-center justify-center gap-1.5 border border-dashed border-[#C9C5BA] bg-white px-4 text-center text-sm text-ink-muted hover:border-obsidian">
          <ImagePlus className="h-6 w-6" strokeWidth={1.4} aria-hidden="true" />
          <span className="font-semibold text-obsidian">{busy ?? (single && value.length ? "Replace image" : "Upload photos")}</span>
          <span className="text-xs">JPG, PNG, WebP or AVIF · up to 10 MB each{single ? "" : ` · ${value.length}/${limit}`}</span>
          <input ref={input} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} multiple={!single} disabled={Boolean(busy)} onChange={(e) => void onFiles(e.target.files)} className="sr-only" />
        </label>
      ) : null}
      {error ? <p role="alert" className="text-sm text-[#9F3A2B]">{error}</p> : null}
    </div>
  );
}
