import { SafeImage } from "@/components/shared/safe-image";
import { Search } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { BODY_TYPE_LABELS } from "@/lib/vehicles/labels";
import type { BodyType } from "@prisma/client";
import { formatPrice } from "@/lib/utils";

interface HeroProps {
  eyebrow: string;
  heading: string;
  subheading: string;
  imageUrl: string | null;
  imageAlt: string | null;
  makes: string[];
  bodyTypes: BodyType[];
  currency: string;
  locale: string;
  availableCount: number;
}

const PRICE_STEPS = [25_000_000, 50_000_000, 100_000_000, 200_000_000];

/** Splits "Discover Excellence. Drive Your Dreams." so the second sentence can be set in italic. */
function splitHeading(heading: string): [string, string | null] {
  const match = heading.match(/^(.+?[.!?])\s+(.+)$/);
  return match?.[1] && match[2] ? [match[1], match[2]] : [heading, null];
}

export function Hero(props: HeroProps) {
  const [lead, tail] = splitHeading(props.heading);
  return (
    <section className="relative overflow-hidden bg-obsidian text-white">
      <div className="absolute inset-0">
        {props.imageUrl ? (
          <SafeImage
            src={props.imageUrl}
            alt={props.imageAlt ?? ""}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="texture-hairline absolute inset-0 bg-[#1A1D22]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,17,20,0.92)_0%,rgba(16,17,20,0.6)_55%,rgba(16,17,20,0.25)_100%)]" />
      </div>

      <div className="relative mx-auto flex max-w-content flex-col gap-7 px-6 pb-16 pt-28 md:pt-36">
        <span className="eyebrow text-champagne">{props.eyebrow}</span>
        <h1 className="heading-display max-w-[52rem] text-[clamp(2.75rem,6.4vw,5.5rem)] leading-[1.02] tracking-[-0.01em]">
          {lead}
          {tail ? (
            <>
              {" "}
              <em className="italic text-champagne-light">{tail}</em>
            </>
          ) : null}
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-[#C9CBD0] text-pretty">{props.subheading}</p>
        <div className="mt-2 flex flex-wrap gap-3.5">
          <ButtonLink href="/inventory" variant="gold" size="lg">
            Explore our collection
          </ButtonLink>
          <ButtonLink href="/contact" variant="outline-light" size="lg">
            Speak with our team
          </ButtonLink>
        </div>
      </div>

      {/* Discovery search — a plain GET form, so it works before JavaScript loads */}
      <div className="relative mx-auto max-w-content px-6 pb-16">
        <form
          action="/inventory"
          method="get"
          role="search"
          aria-label="Find a vehicle"
          className="grid gap-3.5 rounded bg-ivory p-5 text-obsidian shadow-[0_30px_60px_rgba(0,0,0,0.35)] sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto] lg:items-end"
        >
          <label className="field-label">
            Keyword
            <input name="q" type="search" placeholder="Make, model or stock no." className="field" />
          </label>
          <label className="field-label">
            Make
            <select name="make" className="field" defaultValue="">
              <option value="">Any make</option>
              {props.makes.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Body type
            <select name="body" className="field" defaultValue="">
              <option value="">All body types</option>
              {props.bodyTypes.map((b) => (
                <option key={b} value={b}>
                  {BODY_TYPE_LABELS[b]}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Max price
            <select name="priceMax" className="field" defaultValue="">
              <option value="">No limit</option>
              {PRICE_STEPS.map((p) => (
                <option key={p} value={p}>
                  {formatPrice(p, props.currency, props.locale)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center gap-2.5 rounded bg-obsidian px-6 text-xs font-bold uppercase tracking-button text-white transition-colors hover:bg-graphite sm:col-span-2 lg:col-span-1"
          >
            <Search className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            Search {props.availableCount > 0 ? `${props.availableCount} vehicles` : "inventory"}
          </button>
        </form>
      </div>
    </section>
  );
}
