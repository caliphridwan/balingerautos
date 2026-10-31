import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";

interface Category {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export function CategoryGrid({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;
  return (
    <section className="border-t border-ivory-line bg-white">
      <div className="mx-auto flex max-w-content flex-col gap-11 px-6 py-24">
        <SectionHeading eyebrow="Explore by category" title="Find the shape of your next drive" />
        <ul className="grid gap-px border border-ivory-line bg-ivory-line sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <li key={c.id} className="bg-white">
              <Link
                href={`/inventory?category=${c.slug}`}
                className="group flex min-h-[120px] items-center justify-between gap-4 px-7 py-7 transition-colors hover:bg-ivory"
              >
                <span className="flex flex-col gap-1.5">
                  <span className="font-display text-2xl">{c.name}</span>
                  <span className="text-[13px] text-ink-muted">
                    {c.count === 1 ? "1 vehicle" : `${c.count} vehicles`}
                  </span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="h-5 w-5 text-deepgold transition-transform group-hover:translate-x-1"
                  strokeWidth={1.4}
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
