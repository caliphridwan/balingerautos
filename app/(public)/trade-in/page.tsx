import type { Metadata } from "next";
import { VehicleStatus } from "@prisma/client";
import { TradeInForm } from "@/components/forms/trade-in-form";
import { PageHero } from "@/components/shared/page-hero";
import { vehicleTitle } from "@/lib/vehicles/format";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { currencySymbol } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Trade-in & Vehicle Exchange",
  description: "Get a valuation for your current vehicle and put it towards your next one.",
  alternates: { canonical: "/trade-in" },
};

const tips = [
  "Photograph in daylight: front, rear, both sides, interior and the dashboard showing mileage.",
  "Mention service history, number of owners and any outstanding finance.",
  "Our team will review the details and contact you with a valuation.",
];

export default async function TradeInPage({ searchParams }: { searchParams: { vehicle?: string } }) {
  const settings = await getSiteSettings();
  const target = searchParams.vehicle
    ? await prisma.vehicle.findFirst({
        where: { slug: searchParams.vehicle, isPublished: true, status: { in: [VehicleStatus.AVAILABLE, VehicleStatus.RESERVED] } },
        select: { id: true, year: true, make: true, model: true, trim: true },
      })
    : null;

  return (
    <>
      <PageHero
        eyebrow="Trade-in & exchange"
        title="Trade up with confidence"
        description="Tell us about your current vehicle and our team will review it and come back to you with a valuation."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Trade-in" }]}
      />
      <section className="bg-ivory">
        <div className="mx-auto grid max-w-content gap-14 px-6 py-20 lg:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col gap-6">
            <h2 className="heading-display text-[30px]">How to get the most accurate valuation</h2>
            <ul className="flex flex-col border-t border-obsidian">
              {tips.map((t) => (
                <li key={t} className="border-b border-ivory-line py-5 text-[15px] leading-relaxed text-ink-body">
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="border border-ivory-line bg-white p-6 sm:p-10">
            <TradeInForm
              targetVehicle={target ? { id: target.id, title: vehicleTitle(target) } : undefined}
              currencyLabel={currencySymbol(settings.currency, settings.locale)}
              mileageUnit={settings.mileageUnit}
              uploadsEnabled={isCloudinaryConfigured()}
            />
          </div>
        </div>
      </section>
    </>
  );
}
