import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/shared/reveal";
import { TextLink } from "@/components/ui/button";
import { VehicleCard, type CardFormat } from "@/components/vehicles/vehicle-card";
import type { VehicleCardData } from "@/lib/vehicles/queries";
import { cn } from "@/lib/utils";

interface VehicleShowcaseProps {
  id?: string;
  eyebrow: string;
  title: string;
  vehicles: VehicleCardData[];
  format: CardFormat;
  linkLabel: string;
  linkHref: string;
  columns?: 3 | 4;
  className?: string;
}

/** Used for both Featured Collection and Latest Arrivals. */
export function VehicleShowcase({
  id,
  eyebrow,
  title,
  vehicles,
  format,
  linkLabel,
  linkHref,
  columns = 3,
  className,
}: VehicleShowcaseProps) {
  if (vehicles.length === 0) return null;
  return (
    <section id={id} className={cn("bg-ivory", className)}>
      <div className="mx-auto flex max-w-content flex-col gap-12 px-6 py-24 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading eyebrow={eyebrow} title={title} />
          <TextLink href={linkHref}>{linkLabel}</TextLink>
        </div>
        <ul className={cn("grid gap-7 sm:grid-cols-2", columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
          {vehicles.map((v, i) => (
            <Reveal as="li" key={v.id} delay={i * 0.06} className="flex">
              <div className="flex w-full flex-col [&>article]:flex-1">
                <VehicleCard vehicle={v} format={format} />
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
