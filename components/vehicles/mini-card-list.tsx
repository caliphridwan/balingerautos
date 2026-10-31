"use client";

import { SafeImage } from "@/components/shared/safe-image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Car, X } from "lucide-react";

export interface MiniCard {
  slug: string;
  title: string;
  price: string;
  mileage: string;
  status: string;
  image: { url: string; alt: string | null } | null;
}

/** Fetches card data for a list of slugs (keeps the order given). */
export function useVehicleCards(slugs: string[]) {
  const [cards, setCards] = useState<MiniCard[] | null>(null);
  const key = slugs.join(",");
  useEffect(() => {
    if (!key) {
      setCards([]);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/vehicles/cards?slugs=${encodeURIComponent(key)}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { vehicles: [] }))
      .then((d: { vehicles: MiniCard[] }) => setCards(d.vehicles))
      .catch((e: unknown) => {
        if (!(e instanceof DOMException && e.name === "AbortError")) setCards([]);
      });
    return () => controller.abort();
  }, [key]);
  return cards;
}

export function MiniCardGrid({ cards, onRemove, removeLabel = "Remove" }: { cards: MiniCard[]; onRemove?: (slug: string) => void; removeLabel?: string }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <li key={c.slug} className="group relative flex flex-col border border-ivory-line bg-white">
          <div className="relative aspect-[16/10] overflow-hidden bg-graphite">
            {c.image ? (
              <SafeImage src={c.image.url} alt={c.image.alt ?? c.title} fill sizes="(min-width: 1024px) 300px, 50vw" className="object-cover" />
            ) : (
              <div className="texture-hairline absolute inset-0 flex items-center justify-center">
                <Car aria-hidden="true" className="h-8 w-8 text-graphite-muted" strokeWidth={1} />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1.5 p-5">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
              {c.status} · {c.mileage}
            </span>
            <Link href={`/inventory/${c.slug}`} className="font-display text-lg leading-snug after:absolute after:inset-0">
              {c.title}
            </Link>
            <span className="font-bold">{c.price}</span>
          </div>
          {onRemove ? (
            <button
              type="button"
              onClick={() => onRemove(c.slug)}
              aria-label={`${removeLabel}: ${c.title}`}
              className="absolute right-2 top-2 z-10 inline-flex h-10 w-10 items-center justify-center bg-obsidian/80 text-white hover:bg-obsidian"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
