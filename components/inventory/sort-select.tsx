"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  SORT_LABELS,
  SORT_OPTIONS,
  inventoryHref,
  type InventoryFilters,
  type SortOption,
} from "@/lib/inventory-params";

export function SortSelect({ filters }: { filters: InventoryFilters }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <label className="flex items-center gap-2.5 text-[13px] text-ink-muted">
      Sort by
      <select
        value={filters.sort}
        aria-busy={pending}
        onChange={(e) =>
          startTransition(() =>
            router.push(inventoryHref({ ...filters, sort: e.target.value as SortOption, page: 1 }), { scroll: false }),
          )
        }
        className="h-11 rounded border border-[#D4D1C8] bg-white px-3 text-sm font-semibold text-obsidian focus:border-obsidian focus:outline-none"
      >
        {SORT_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {SORT_LABELS[s]}
          </option>
        ))}
      </select>
    </label>
  );
}
