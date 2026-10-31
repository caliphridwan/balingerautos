import type { Metadata } from "next";
import { PageHero } from "@/components/shared/page-hero";
import { FavouritesList } from "./favourites-list";

export const metadata: Metadata = {
  title: "Saved Vehicles",
  robots: { index: false },
};

export default function FavouritesPage() {
  return (
    <>
      <PageHero
        eyebrow="Your shortlist"
        title="Saved vehicles"
        description="Vehicles you've saved on this device. They stay here until you remove them."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Saved vehicles" }]}
      />
      <section className="bg-ivory">
        <div className="mx-auto max-w-content px-6 py-16">
          <FavouritesList />
        </div>
      </section>
    </>
  );
}
