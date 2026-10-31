"use client";

import { SafeImage } from "@/components/shared/safe-image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VehicleImage } from "./vehicle-image";

interface GalleryImage {
  id: string;
  url: string;
  alt: string | null;
}

/** Main image + thumbnails, with a keyboard- and touch-friendly fullscreen viewer. */
export function VehicleGallery({ images, title, badge }: { images: GalleryImage[]; title: string; badge?: React.ReactNode }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const touchStart = useRef<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const count = images.length;
  const current = images[index];

  const go = useCallback((delta: number) => setIndex((i) => (count ? (i + delta + count) % count : 0)), [count]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const trigger = triggerRef.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      trigger?.focus();
    };
  }, [open, go]);

  const swipe = {
    onTouchStart: (e: React.TouchEvent) => {
      touchStart.current = e.touches[0]?.clientX ?? null;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const start = touchStart.current;
      const end = e.changedTouches[0]?.clientX;
      if (start !== null && end !== undefined && Math.abs(end - start) > 40) go(end < start ? 1 : -1);
      touchStart.current = null;
    },
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[16/10] overflow-hidden bg-graphite" {...swipe}>
        <VehicleImage image={current} fallbackAlt={title} priority sizes="(min-width: 1024px) 760px, 100vw" />
        {badge}
        {count > 0 ? (
          <>
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open fullscreen gallery"
              className="absolute bottom-4 right-4 inline-flex h-11 w-11 items-center justify-center border border-graphite-muted bg-obsidian/70 text-white hover:bg-obsidian"
            >
              <Expand className="h-[18px] w-[18px]" strokeWidth={1.6} />
            </button>
            <span className="absolute bottom-4 left-4 bg-obsidian/70 px-2.5 py-1 text-xs font-semibold text-white">
              {index + 1} / {count}
            </span>
          </>
        ) : null}
        {count > 1 ? (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-obsidian/60 text-white hover:bg-obsidian">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-obsidian/60 text-white hover:bg-obsidian">
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <ul className="grid grid-cols-5 gap-2 sm:grid-cols-8">
          {images.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                className={cn("relative block aspect-[4/3] w-full overflow-hidden bg-graphite", i === index ? "outline outline-2 outline-champagne" : "opacity-80 hover:opacity-100")}
              >
                <SafeImage src={img.url} alt="" fill sizes="120px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {open && current ? (
        <div role="dialog" aria-modal="true" aria-label={`${title} photos`} className="fixed inset-0 z-[60] flex flex-col bg-obsidian/95" {...swipe}>
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-sm">
              {index + 1} / {count}
            </span>
            <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Close gallery" className="inline-flex h-11 w-11 items-center justify-center hover:text-champagne">
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="relative flex-1">
            <SafeImage src={current.url} alt={current.alt ?? title} fill sizes="100vw" className="object-contain" />
            {count > 1 ? (
              <>
                <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center text-white hover:text-champagne">
                  <ChevronLeft className="h-8 w-8" />
                </button>
                <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-2 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center text-white hover:text-champagne">
                  <ChevronRight className="h-8 w-8" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
