"use client";

import Link from "next/link";
import { FAVOURITES_KEY, MAX_FAVOURITES, useLocalList } from "@/hooks/use-local-list";
import { MiniCardGrid, useVehicleCards } from "@/components/vehicles/mini-card-list";

export function FavouritesList() {
  const { items, remove } = useLocalList(FAVOURITES_KEY, MAX_FAVOURITES);
  const cards = useVehicleCards(items);

  if (cards === null) return <p className="text-ink-muted">Loading your saved vehicles…</p>;
  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-[17px] text-ink-body">You haven't saved any vehicles yet. Tap “Save” on any vehicle page to add it here.</p>
        <Link href="/inventory" className="inline-flex min-h-[48px] items-center bg-obsidian px-6 text-xs font-bold uppercase tracking-button text-white">
          Browse inventory
        </Link>
      </div>
    );
  }
  return <MiniCardGrid cards={cards} onRemove={remove} removeLabel="Remove from saved" />;
}
