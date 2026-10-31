"use client";

import { useState } from "react";
import { ImageManager, type ManagedImage } from "./image-manager";

/**
 * Single CMS image inside an AdminForm. Posts JSON {publicId?, url} under
 * `name`; the server verifies new uploads and keeps unchanged URLs.
 */
export function ContentImageField({ name, label, initialUrl, uploadsEnabled, error }: { name: string; label: string; initialUrl: string | null; uploadsEnabled: boolean; error?: string }) {
  const [images, setImages] = useState<ManagedImage[]>(initialUrl ? [{ url: initialUrl }] : []);
  const current = images[0];
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">{label}</span>
      {uploadsEnabled ? (
        <ImageManager value={images} onChange={setImages} single scope="content" />
      ) : (
        <p className="text-xs text-ink-muted">Image uploads need Cloudinary to be configured.</p>
      )}
      <input type="hidden" name={name} value={current ? JSON.stringify({ publicId: current.publicId, url: current.url }) : ""} />
      {error ? <span role="alert" className="text-xs text-[#9F3A2B]">{error}</span> : null}
    </div>
  );
}
