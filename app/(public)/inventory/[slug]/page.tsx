import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { MessageCircle, Phone } from "lucide-react";
import { FeatureGroup, VehicleStatus } from "@prisma/client";
import { EnquiryPanel } from "@/components/vehicles/enquiry-panel";
import { VehicleGallery } from "@/components/vehicles/gallery";
import { MobileCtaBar } from "@/components/vehicles/mobile-cta-bar";
import { RecentlyViewed, RecordVehicleView } from "@/components/vehicles/recently-viewed";
import { StatusBadge } from "@/components/vehicles/status-badge";
import { VehicleActions } from "@/components/vehicles/vehicle-actions";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { BOOKING_WINDOW_DAYS } from "@/lib/appointments";
import { convertedPrices, parseAltCurrencies } from "@/lib/currency";
import { depositFor } from "@/lib/payments/service";
import { isPaystackConfigured } from "@/lib/paystack";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { addDays, todayInZone } from "@/lib/time";
import { absoluteUrl, currencySymbol, formatMileage, formatNumber, formatPrice } from "@/lib/utils";
import { vehicleTitle } from "@/lib/vehicles/format";
import { BODY_TYPE_LABELS, CONDITION_LABELS, FUEL_LABELS, TRANSMISSION_LABELS } from "@/lib/vehicles/labels";
import { vehicleCardSelect } from "@/lib/vehicles/queries";
import { telLink, vehicleWhatsappMessage, whatsappLink } from "@/lib/whatsapp";

export const revalidate = 300;

type PageProps = { params: { slug: string } };

const DRIVETRAIN_LABELS = { FWD: "Front-wheel drive", RWD: "Rear-wheel drive", AWD: "All-wheel drive", FOUR_WD: "Four-wheel drive" } as const;

const FEATURE_GROUP_LABELS: Record<FeatureGroup, string> = {
  KEY: "Key features",
  SAFETY: "Safety",
  COMFORT: "Comfort",
  TECHNOLOGY: "Technology",
};

const getVehicle = cache(async (slug: string) =>
  prisma.vehicle.findFirst({
    where: { slug, isPublished: true, status: { not: VehicleStatus.ARCHIVED } },
    include: {
      images: { orderBy: { position: "asc" } },
      features: { orderBy: [{ group: "asc" }, { position: "asc" }] },
    },
  }),
);

export async function generateStaticParams() {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { isPublished: true, status: { not: VehicleStatus.ARCHIVED } },
      select: { slug: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return vehicles.map((v) => ({ slug: v.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const [vehicle, settings] = await Promise.all([getVehicle(params.slug), getSiteSettings()]);
  if (!vehicle) return { title: "Vehicle not found", robots: { index: false } };
  const title = vehicle.metaTitle ?? vehicleTitle(vehicle);
  const price = vehicle.priceOnRequest ? "Price on request" : formatPrice(Number(vehicle.price), vehicle.currency, settings.locale);
  const description =
    vehicle.metaDescription ??
    `${vehicleTitle(vehicle)} — ${price}, ${formatMileage(vehicle.mileage, settings.mileageUnit, settings.locale)}, ${TRANSMISSION_LABELS[vehicle.transmission]}, ${FUEL_LABELS[vehicle.fuelType]}. Available at ${settings.businessName}.`;
  const image = vehicle.images[0];
  return {
    title,
    description,
    alternates: { canonical: `/inventory/${vehicle.slug}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/inventory/${vehicle.slug}`,
      images: image ? [{ url: image.url, alt: image.alt ?? title }] : undefined,
    },
  };
}

export default async function VehicleDetailPage({ params }: PageProps) {
  const [vehicle, settings] = await Promise.all([getVehicle(params.slug), getSiteSettings()]);
  if (!vehicle) notFound();

  const title = vehicleTitle(vehicle);
  const locale = settings.locale;
  const priceNumber = Number(vehicle.price);
  const priceText = vehicle.priceOnRequest ? "Price on request" : formatPrice(priceNumber, vehicle.currency, locale);
  const altPrices = vehicle.priceOnRequest ? [] : convertedPrices(priceNumber, vehicle.currency, parseAltCurrencies(settings.altCurrencies), locale);
  const url = absoluteUrl(`/inventory/${vehicle.slug}`);
  const whatsappHref = whatsappLink(settings.whatsappNumber, vehicleWhatsappMessage({ title, stockNumber: vehicle.stockNumber, price: priceText, url }));
  const phoneHref = telLink(settings.phone);
  const today = todayInZone(settings.timezone);
  const isSold = vehicle.status === VehicleStatus.SOLD;
  const depositAmount = depositFor(priceNumber, Number(settings.reservationDepositAmount));
  const deposit =
    settings.reservationDepositEnabled && isPaystackConfigured() && vehicle.status === VehicleStatus.AVAILABLE && vehicle.currency === "NGN" && !vehicle.priceOnRequest && depositAmount >= 100
      ? { label: formatPrice(depositAmount, "NGN", "en-NG"), holdDays: settings.reservationHoldDays }
      : null;

  const similar = await prisma.vehicle.findMany({
    where: {
      id: { not: vehicle.id },
      isPublished: true,
      status: { in: [VehicleStatus.AVAILABLE, VehicleStatus.RESERVED] },
      OR: [{ bodyType: vehicle.bodyType }, { make: vehicle.make }],
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: 3,
    select: vehicleCardSelect,
  });

  const keySpecs = [
    { label: "Mileage", value: formatMileage(vehicle.mileage, settings.mileageUnit, locale) },
    { label: "Transmission", value: TRANSMISSION_LABELS[vehicle.transmission] },
    { label: "Fuel", value: FUEL_LABELS[vehicle.fuelType] },
    vehicle.engineCapacityCc ? { label: "Engine", value: `${(vehicle.engineCapacityCc / 1000).toFixed(1)} L` } : null,
    vehicle.horsepower ? { label: "Power", value: `${vehicle.horsepower} hp` } : null,
    vehicle.drivetrain ? { label: "Drivetrain", value: vehicle.drivetrain === "FOUR_WD" ? "4WD" : vehicle.drivetrain } : null,
  ].filter((s): s is { label: string; value: string } => s !== null);

  const specs: Array<[string, string | null]> = [
    ["Make", vehicle.make],
    ["Model", vehicle.model],
    ["Trim", vehicle.trim],
    ["Year", String(vehicle.year)],
    ["Body type", BODY_TYPE_LABELS[vehicle.bodyType]],
    ["Condition", CONDITION_LABELS[vehicle.condition]],
    ["Mileage", formatMileage(vehicle.mileage, settings.mileageUnit, locale)],
    ["Transmission", TRANSMISSION_LABELS[vehicle.transmission]],
    ["Fuel type", FUEL_LABELS[vehicle.fuelType]],
    ["Engine capacity", vehicle.engineCapacityCc ? `${formatNumber(vehicle.engineCapacityCc, locale)} cc` : null],
    ["Horsepower", vehicle.horsepower ? `${vehicle.horsepower} hp` : null],
    ["Drivetrain", vehicle.drivetrain ? DRIVETRAIN_LABELS[vehicle.drivetrain] : null],
    ["Exterior colour", vehicle.exteriorColour],
    ["Interior colour", vehicle.interiorColour],
    ["Doors", vehicle.doors ? String(vehicle.doors) : null],
    ["Seats", vehicle.seats ? String(vehicle.seats) : null],
    ["Stock number", vehicle.stockNumber],
    ["VIN", vehicle.showVin && vehicle.vin ? vehicle.vin : null],
  ];
  const specRows = specs.filter((row): row is [string, string] => Boolean(row[1]));

  const featureGroups = (Object.keys(FEATURE_GROUP_LABELS) as FeatureGroup[])
    .map((group) => ({ group, items: vehicle.features.filter((f) => f.group === group) }))
    .filter((g) => g.items.length > 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["Product", "Car"],
    name: title,
    brand: { "@type": "Brand", name: vehicle.make },
    model: vehicle.model,
    vehicleModelDate: String(vehicle.year),
    bodyType: BODY_TYPE_LABELS[vehicle.bodyType],
    fuelType: FUEL_LABELS[vehicle.fuelType],
    vehicleTransmission: TRANSMISSION_LABELS[vehicle.transmission],
    color: vehicle.exteriorColour,
    mileageFromOdometer: { "@type": "QuantitativeValue", value: vehicle.mileage, unitCode: settings.mileageUnit === "mi" ? "SMI" : "KMT" },
    itemCondition: vehicle.condition === "NEW" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
    sku: vehicle.stockNumber,
    url,
    image: vehicle.images.map((i) => i.url),
    ...(vehicle.priceOnRequest
      ? {}
      : {
          offers: {
            "@type": "Offer",
            price: priceNumber,
            priceCurrency: vehicle.currency,
            availability:
              vehicle.status === "AVAILABLE"
                ? "https://schema.org/InStock"
                : vehicle.status === "RESERVED"
                  ? "https://schema.org/LimitedAvailability"
                  : "https://schema.org/SoldOut",
            seller: { "@type": "AutoDealer", name: settings.businessName },
          },
        }),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Inventory", item: absoluteUrl("/inventory") },
      { "@type": "ListItem", position: 3, name: title, item: url },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumbLd]).replace(/</g, "\\u003c") }} />
      <RecordVehicleView slug={vehicle.slug} id={vehicle.id} />

      <div className="mx-auto max-w-content px-6 pt-7">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap gap-2.5 text-[13px] text-ink-muted">
            <li>
              <Link href="/" className="hover:text-obsidian">Home</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/inventory" className="hover:text-obsidian">Inventory</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-obsidian">{title}</li>
          </ol>
        </nav>
      </div>

      <section className="mx-auto flex max-w-content flex-col gap-10 px-6 pb-16 pt-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <VehicleGallery
            images={vehicle.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt }))}
            title={title}
            badge={<StatusBadge status={vehicle.status} condition={vehicle.condition} className="absolute left-5 top-5" />}
          />
          {vehicle.videoUrl ? (
            <a href={vehicle.videoUrl} target="_blank" rel="noopener noreferrer" className="self-start text-xs font-bold uppercase tracking-[0.12em] underline underline-offset-4 hover:text-deepgold">
              Watch walkaround video
            </a>
          ) : null}
        </div>

        <aside className="flex w-full flex-col gap-6 lg:w-[400px]">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-ink-muted">
              {vehicle.year} · {CONDITION_LABELS[vehicle.condition]} · Stock {vehicle.stockNumber}
            </span>
            <h1 className="heading-display text-[clamp(2rem,3.4vw,2.9rem)] leading-[1.08]">
              {vehicle.make} {vehicle.model}
            </h1>
            {vehicle.trim ? <p className="text-[15px] text-ink-body">{vehicle.trim}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5 bg-obsidian p-6 text-white">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-mist">{isSold ? "Sold" : "Price"}</span>
            <span className="text-[40px] font-bold leading-tight tracking-tight">{priceText}</span>
            {altPrices.length > 0 ? (
              <span className="text-sm text-mist">
                {altPrices.join(" · ")}
                {settings.altCurrenciesNote ? <span className="block text-xs text-mist-dim">{settings.altCurrenciesNote}</span> : null}
              </span>
            ) : null}
          </div>

          <dl className="grid grid-cols-2 gap-px border border-ivory-line bg-ivory-line">
            {keySpecs.map((s) => (
              <div key={s.label} className="flex flex-col gap-1 bg-white px-4 py-3.5">
                <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">{s.label}</dt>
                <dd className="text-[15px] font-semibold">{s.value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-col gap-2.5">
            {!isSold ? (
              <a href="#enquire" className="inline-flex min-h-[56px] items-center justify-center rounded bg-champagne text-[13px] font-bold uppercase tracking-button text-obsidian hover:bg-champagne-hover">
                {deposit ? `Reserve online · ${deposit.label} deposit` : vehicle.status === VehicleStatus.AVAILABLE ? "Book a test drive or enquire" : "Enquire about this vehicle"}
              </a>
            ) : null}
            <div className="grid grid-cols-2 gap-2.5">
              {whatsappHref ? (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded bg-obsidian text-xs font-bold uppercase tracking-button text-white hover:bg-graphite">
                  <MessageCircle className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" /> WhatsApp
                </a>
              ) : null}
              {phoneHref ? (
                <a href={phoneHref} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded border border-obsidian text-xs font-bold uppercase tracking-button hover:bg-obsidian hover:text-white">
                  <Phone className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" /> Call
                </a>
              ) : null}
              <Link href={`/financing?vehicle=${vehicle.slug}`} className="inline-flex min-h-[52px] items-center justify-center rounded border border-obsidian text-xs font-bold uppercase tracking-button hover:bg-obsidian hover:text-white">
                Financing
              </Link>
              <Link href={`/trade-in?vehicle=${vehicle.slug}`} className="inline-flex min-h-[52px] items-center justify-center rounded border border-obsidian text-xs font-bold uppercase tracking-button hover:bg-obsidian hover:text-white">
                Trade-in
              </Link>
            </div>
          </div>
          <VehicleActions slug={vehicle.slug} title={title} url={url} />
        </aside>
      </section>

      <section className="border-t border-ivory-line bg-white">
        <div className="mx-auto flex max-w-content flex-col gap-14 px-6 py-20 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-14">
            {vehicle.description ? (
              <div className="flex max-w-3xl flex-col gap-4">
                <h2 className="heading-display text-[34px]">Overview</h2>
                <p className="whitespace-pre-line text-base leading-[1.8] text-ink-body">{vehicle.description}</p>
              </div>
            ) : null}

            <div className="flex flex-col gap-5">
              <h2 className="heading-display text-[34px]">Specifications</h2>
              <dl className="grid border-t border-obsidian md:grid-cols-2 md:gap-x-10">
                {specRows.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 border-b border-ivory-soft py-3.5 text-[15px]">
                    <dt className="text-ink-muted">{label}</dt>
                    <dd className="text-right font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {featureGroups.length > 0 ? (
              <div className="grid gap-10 sm:grid-cols-2">
                {featureGroups.map((g) => (
                  <div key={g.group} className="flex flex-col gap-4">
                    <h3 className="text-[13px] font-bold uppercase tracking-[0.2em]">{FEATURE_GROUP_LABELS[g.group]}</h3>
                    <ul className="flex flex-col gap-2.5 text-[15px] text-ink-body">
                      {g.items.map((f) => (
                        <li key={f.id} className="border-b border-ivory-soft pb-2.5">
                          {f.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}

            {vehicle.inspectionNotes || vehicle.inspectedAt || vehicle.serviceHistory || vehicle.previousOwners !== null ? (
              <div className="flex flex-col gap-4 border border-ivory-line bg-ivory p-8">
                <h2 className="heading-display text-[28px]">Condition &amp; inspection</h2>
                <dl className="grid gap-5 text-sm sm:grid-cols-3">
                  {vehicle.inspectedAt ? (
                    <div className="flex flex-col gap-1">
                      <dt className="text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">Inspected</dt>
                      <dd className="font-semibold">{vehicle.inspectedAt.toLocaleDateString(locale, { dateStyle: "medium", timeZone: settings.timezone })}</dd>
                    </div>
                  ) : null}
                  {vehicle.serviceHistory ? (
                    <div className="flex flex-col gap-1">
                      <dt className="text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">Service history</dt>
                      <dd className="font-semibold">{vehicle.serviceHistory}</dd>
                    </div>
                  ) : null}
                  {vehicle.previousOwners !== null ? (
                    <div className="flex flex-col gap-1">
                      <dt className="text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">Previous owners</dt>
                      <dd className="font-semibold">{vehicle.previousOwners}</dd>
                    </div>
                  ) : null}
                </dl>
                {vehicle.inspectionNotes ? <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-body">{vehicle.inspectionNotes}</p> : null}
              </div>
            ) : null}
          </div>

          <div className="w-full lg:sticky lg:top-28 lg:w-[440px]">
            {isSold ? (
              <div className="flex flex-col gap-4 bg-obsidian p-8 text-white">
                <span className="eyebrow text-champagne">This vehicle has been sold</span>
                <p className="text-mist">Looking for something similar? We can source one for you.</p>
                <Link href="/services#sourcing" className="inline-flex min-h-[52px] items-center justify-center bg-champagne text-xs font-bold uppercase tracking-button text-obsidian">
                  Request sourcing
                </Link>
              </div>
            ) : (
              <EnquiryPanel
                vehicle={{
                  id: vehicle.id,
                  slug: vehicle.slug,
                  title,
                  stockNumber: vehicle.stockNumber,
                  priceLabel: priceText,
                  available: vehicle.status === VehicleStatus.AVAILABLE,
                  reservable: vehicle.status === VehicleStatus.AVAILABLE,
                }}
                minDate={today}
                maxDate={addDays(today, BOOKING_WINDOW_DAYS)}
                currencyLabel={currencySymbol(vehicle.currency, locale)}
                deposit={deposit}
              />
            )}
          </div>
        </div>
      </section>

      {similar.length > 0 ? (
        <section className="bg-ivory">
          <div className="mx-auto flex max-w-content flex-col gap-9 px-6 py-20">
            <h2 className="heading-display text-[clamp(1.9rem,3.4vw,2.6rem)]">Similar vehicles</h2>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((v) => (
                <li key={v.id} className="flex [&>article]:flex-1">
                  <VehicleCard vehicle={v} format={{ locale, mileageUnit: settings.mileageUnit }} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <RecentlyViewed excludeSlug={vehicle.slug} />
      <div className="h-[68px] lg:hidden" aria-hidden="true" />
      {!isSold ? <MobileCtaBar price={priceText} phoneHref={phoneHref} whatsappHref={whatsappHref} /> : null}
    </>
  );
}
