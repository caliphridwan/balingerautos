"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { COMPARE_KEY, MAX_COMPARE, useLocalList } from "@/hooks/use-local-list";

/**
 * Keeps the URL and the visitor's saved comparison in step: visiting
 * /compare with no slugs loads the saved list; shared links still work.
 */
export function CompareSync({ vehicles }: { vehicles: Array<{ slug: string; title: string }> }) {
  const slugs = vehicles.map((v) => v.slug);
  const { items, remove, clear } = useLocalList(COMPARE_KEY, MAX_COMPARE);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    if (!params.get("v") && items.length > 0) router.replace(`${pathname}?v=${items.join(",")}`);
  }, [items, params, pathname, router]);

  if (slugs.length === 0) return null;
  return (
    <div className="border-b border-ivory-line bg-white">
      <div className="mx-auto flex max-w-content flex-wrap items-center gap-3 px-6 py-4 text-sm">
        <span className="text-ink-muted">Comparing {slugs.length} vehicles.</span>
        {vehicles.map(({ slug: s, title }) =>
          items.includes(s) ? (
            <button
              key={s}
              type="button"
              onClick={() => {
                remove(s);
                const next = slugs.filter((x) => x !== s);
                router.replace(next.length ? `${pathname}?v=${next.join(",")}` : pathname);
              }}
              className="min-h-[36px] border border-[#D4D1C8] px-3 text-xs font-semibold hover:border-obsidian"
            >
              Remove {title}
            </button>
          ) : null,
        )}
        <button
          type="button"
          onClick={() => {
            clear();
            router.replace(pathname);
          }}
          className="min-h-[36px] text-xs font-bold uppercase tracking-[0.1em] text-deepgold underline underline-offset-4"
        >
          Clear comparison
        </button>
        <Link href="/inventory" className="ml-auto text-xs font-bold uppercase tracking-[0.1em] underline underline-offset-4">
          Add another
        </Link>
      </div>
    </div>
  );
}
