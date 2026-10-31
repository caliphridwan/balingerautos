"use client";

import { useEffect } from "react";
import { MAX_RECENT, RECENT_KEY, useLocalList } from "@/hooks/use-local-list";
import { MiniCardGrid, useVehicleCards } from "./mini-card-list";

/** Records the current vehicle and counts the view (once per page load). */
export function RecordVehicleView({ slug, id }: { slug: string; id: string }) {
  const { add } = useLocalList(RECENT_KEY, MAX_RECENT);
  useEffect(() => {
    add(slug, { front: true });
    try {
      const url = `/api/vehicles/${id}/view`;
      const queued = typeof navigator.sendBeacon === "function" && navigator.sendBeacon(url);
      if (!queued) void fetch(url, { method: "POST", keepalive: true });
    } catch {
      // analytics only
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, id]);
  return null;
}

export function RecentlyViewed({ excludeSlug, title = "Recently viewed" }: { excludeSlug?: string; title?: string }) {
  const { items } = useLocalList(RECENT_KEY, MAX_RECENT);
  const slugs = items.filter((s) => s !== excludeSlug).slice(0, 4);
  const cards = useVehicleCards(slugs);
  if (!cards || cards.length === 0) return null;
  return (
    <section aria-label={title} className="bg-white">
      <div className="mx-auto flex max-w-content flex-col gap-8 px-6 py-16">
        <h2 className="heading-display text-[clamp(1.7rem,3vw,2.3rem)]">{title}</h2>
        <MiniCardGrid cards={cards} />
      </div>
    </section>
  );
}
