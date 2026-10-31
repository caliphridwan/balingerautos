import { ButtonLink } from "@/components/ui/button";

export default function VehicleNotFound() {
  return (
    <section className="mx-auto flex max-w-content flex-col items-start gap-5 px-6 py-28">
      <span className="eyebrow text-deepgold">Vehicle unavailable</span>
      <h1 className="heading-display text-[clamp(2.2rem,4vw,3.4rem)]">This listing is no longer available</h1>
      <p className="max-w-lg text-[17px] leading-relaxed text-ink-body">
        It may have been sold or withdrawn. Browse the rest of our collection, or ask our team to find a similar vehicle.
      </p>
      <ButtonLink href="/inventory" variant="dark" size="lg">
        Browse inventory
      </ButtonLink>
    </section>
  );
}
