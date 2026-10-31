import type { Metadata } from "next";
import { VehicleStatus } from "@prisma/client";
import { FinancingForm } from "@/components/forms/financing-form";
import { PageHero } from "@/components/shared/page-hero";
import { vehicleTitle } from "@/lib/vehicles/format";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { currencySymbol, formatPrice } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Financing",
  description: "Submit a financing enquiry for any vehicle in our collection. We'll help you explore options with our lending partners.",
  alternates: { canonical: "/financing" },
};

const steps = [
  { title: "Tell us what you need", body: "Choose a vehicle (optional), your proposed deposit and preferred term." },
  { title: "We review and advise", body: "Our team checks the details and talks you through suitable options." },
  { title: "Lender decision", body: "Your enquiry goes to our lending partners, who set approval and terms." },
];

export default async function FinancingPage({ searchParams }: { searchParams: { vehicle?: string } }) {
  const settings = await getSiteSettings();
  const vehicles = await prisma.vehicle.findMany({
    where: { isPublished: true, status: { in: [VehicleStatus.AVAILABLE, VehicleStatus.RESERVED] }, priceOnRequest: false },
    orderBy: [{ make: "asc" }, { model: "asc" }],
    select: { id: true, slug: true, year: true, make: true, model: true, trim: true, price: true, currency: true },
  });
  const options = vehicles.map((v) => ({
    id: v.id,
    slug: v.slug,
    label: vehicleTitle(v),
    priceLabel: formatPrice(Number(v.price), v.currency, settings.locale),
  }));
  const preselected = searchParams.vehicle ? options.find((o) => o.slug === searchParams.vehicle) : undefined;

  return (
    <>
      <PageHero
        eyebrow="Financing assistance"
        title="Drive now, with a plan that suits you"
        description="Tell us about the vehicle and the deposit and term you have in mind. We'll help you explore options with our lending partners."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Financing" }]}
      />
      <section className="bg-ivory">
        <div className="mx-auto grid max-w-content gap-14 px-6 py-20 lg:grid-cols-[1fr_1.2fr]">
          <div className="flex flex-col gap-10">
            <ol className="flex flex-col border-t border-obsidian">
              {steps.map((s, i) => (
                <li key={s.title} className="flex gap-6 border-b border-ivory-line py-6">
                  <span className="font-display text-2xl text-deepgold">{String(i + 1).padStart(2, "0")}</span>
                  <div className="flex flex-col gap-1.5">
                    <h2 className="text-lg font-semibold">{s.title}</h2>
                    <p className="text-[15px] leading-relaxed text-ink-body">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="border border-ivory-line bg-white p-6 text-sm leading-relaxed text-ink-body">
              <strong className="text-obsidian">Please note:</strong> Balinger Autos is not a lender. Submitting this form is an
              enquiry, not an application, and doesn't guarantee approval. Rates and terms are provided by the lender.
            </div>
          </div>
          <div className="border border-ivory-line bg-white p-6 sm:p-10">
            <h2 className="heading-display mb-6 text-[30px]">Financing enquiry</h2>
            <FinancingForm
              vehicles={preselected ? undefined : options}
              vehicle={preselected}
              currencyLabel={currencySymbol(settings.currency, settings.locale)}
            />
          </div>
        </div>
      </section>
    </>
  );
}
