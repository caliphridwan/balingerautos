import { formatNumber } from "@/lib/utils";

export interface Stat {
  label: string;
  value: number;
  suffix?: string;
}

/** Renders only the statistics the business has actually entered. */
export function StatsBand({ stats, locale }: { stats: Stat[]; locale: string }) {
  if (stats.length === 0) return null;
  return (
    <section aria-label="At a glance" className="bg-graphite text-white">
      <dl className="mx-auto grid max-w-content gap-8 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex flex-col-reverse gap-2 border-l border-graphite-muted pl-6">
            <dt className="text-[13px] uppercase tracking-[0.14em] text-mist">{s.label}</dt>
            <dd className="font-display text-5xl text-champagne">
              {formatNumber(s.value, locale)}
              {s.suffix}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
