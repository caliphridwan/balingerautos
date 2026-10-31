"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, FileText, GitCompare, Heart, Share2 } from "lucide-react";
import { COMPARE_KEY, FAVOURITES_KEY, MAX_COMPARE, MAX_FAVOURITES, useLocalList } from "@/hooks/use-local-list";
import { cn } from "@/lib/utils";

/** Save, compare, share and spec-sheet actions for a vehicle. */
export function VehicleActions({ slug, title, url }: { slug: string; title: string; url: string }) {
  const favourites = useLocalList(FAVOURITES_KEY, MAX_FAVOURITES);
  const compare = useLocalList(COMPARE_KEY, MAX_COMPARE);
  const [note, setNote] = useState<string | null>(null);
  const saved = favourites.has(slug);
  const comparing = compare.has(slug);

  function flash(message: string) {
    setNote(message);
    window.setTimeout(() => setNote(null), 2500);
  }

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      flash("Link copied");
    } catch {
      // user cancelled the share sheet
    }
  }

  const btn = "inline-flex min-h-[44px] items-center gap-2 text-[13px] font-semibold text-ink-body transition-colors hover:text-obsidian";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        <button
          type="button"
          aria-pressed={saved}
          onClick={() => {
            favourites.toggle(slug);
            flash(saved ? "Removed from saved" : "Saved");
          }}
          className={btn}
        >
          <Heart aria-hidden="true" className={cn("h-4 w-4", saved && "fill-obsidian")} strokeWidth={1.6} />
          {saved ? "Saved" : "Save"}
        </button>
        <button
          type="button"
          aria-pressed={comparing}
          onClick={() => {
            if (!comparing && compare.isFull) {
              flash(`You can compare up to ${MAX_COMPARE} vehicles`);
              return;
            }
            compare.toggle(slug);
            flash(comparing ? "Removed from comparison" : "Added to comparison");
          }}
          className={btn}
        >
          {comparing ? <Check aria-hidden="true" className="h-4 w-4" /> : <GitCompare aria-hidden="true" className="h-4 w-4" strokeWidth={1.6} />}
          Compare
        </button>
        <button type="button" onClick={() => void share()} className={btn}>
          <Share2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.6} />
          Share
        </button>
        <Link href={`/spec-sheet/${slug}`} target="_blank" className={btn}>
          <FileText aria-hidden="true" className="h-4 w-4" strokeWidth={1.6} />
          Spec sheet
        </Link>
      </div>
      <p role="status" aria-live="polite" className="min-h-[1.25rem] text-xs text-deepgold">
        {note}
        {comparing && compare.items.length > 1 && !note ? (
          <Link href={`/compare?v=${compare.items.join(",")}`} className="font-semibold underline underline-offset-4">
            Compare {compare.items.length} vehicles →
          </Link>
        ) : null}
      </p>
    </div>
  );
}
