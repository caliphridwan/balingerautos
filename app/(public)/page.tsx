import { BodyType, VehicleStatus } from "@prisma/client";
import { CategoryGrid } from "@/components/home/categories";
import {
  AboutEditorial,
  ContactCta,
  FaqSection,
  HowItWorks,
  PromoBanner,
  ServicesGrid,
  Testimonials,
  WhyChoose,
} from "@/components/home/content-sections";
import { Hero } from "@/components/home/hero";
import { StatsBand, type Stat } from "@/components/home/stats-band";
import { VehicleShowcase } from "@/components/home/vehicle-showcase";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { absoluteUrl } from "@/lib/utils";
import {
  countAvailableVehicles,
  getFeaturedVehicles,
  getLatestArrivals,
  getVisibleCategories,
} from "@/lib/vehicles/queries";
import { telLink, whatsappLink } from "@/lib/whatsapp";

// Re-render at most once a minute; admin actions will also revalidate "/" on change.
export const revalidate = 60;

export default async function HomePage() {
  const settings = await getSiteSettings();
  const format = { locale: settings.locale, mileageUnit: settings.mileageUnit };

  const [featured, categories, availableCount, makes, bodyTypes, testimonials, faqs] = await Promise.all([
    getFeaturedVehicles(3),
    getVisibleCategories(),
    countAvailableVehicles(),
    prisma.vehicle.findMany({
      where: { isPublished: true, status: { in: [VehicleStatus.AVAILABLE, VehicleStatus.RESERVED] } },
      distinct: ["make"],
      select: { make: true },
      orderBy: { make: "asc" },
    }),
    prisma.vehicle.findMany({
      where: { isPublished: true, status: { in: [VehicleStatus.AVAILABLE, VehicleStatus.RESERVED] } },
      distinct: ["bodyType"],
      select: { bodyType: true },
    }),
    prisma.testimonial.findMany({
      where: { isPublished: true },
      orderBy: { position: "asc" },
      take: 6,
      select: { id: true, customerName: true, location: true, vehicleLabel: true, quote: true },
    }),
    prisma.fAQ.findMany({
      where: { isPublished: true },
      orderBy: { position: "asc" },
      select: { id: true, question: true, answer: true },
    }),
  ]);

  const latest = await getLatestArrivals(4, featured.map((v) => v.id));

  const stats: Stat[] = [
    settings.statLiveAvailability ? { label: "Vehicles available", value: availableCount } : null,
    settings.statVehiclesSold !== null ? { label: "Vehicles sold", value: settings.statVehiclesSold, suffix: "+" } : null,
    settings.statCustomers !== null ? { label: "Satisfied customers", value: settings.statCustomers, suffix: "+" } : null,
    settings.statYearsExperience !== null ? { label: "Years of experience", value: settings.statYearsExperience } : null,
  ].filter((s): s is Stat => s !== null && (s.label !== "Vehicles available" || s.value > 0));

  const bodyOrder = Object.values(BodyType);
  const sortedBodyTypes = bodyTypes.map((b) => b.bodyType).sort((a, b) => bodyOrder.indexOf(a) - bodyOrder.indexOf(b));
  const whatsappHref = whatsappLink(settings.whatsappNumber, `Hello ${settings.businessName}, I'd like to speak with your team.`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: settings.businessName,
    url: absoluteUrl("/"),
    slogan: settings.tagline,
    ...(settings.phone ? { telephone: settings.phone } : {}),
    ...(settings.email ? { email: settings.email } : {}),
    ...(settings.addressLine
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: settings.addressLine,
            addressLocality: settings.city ?? undefined,
            addressCountry: settings.country ?? undefined,
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Hero
        eyebrow={settings.heroEyebrow}
        heading={settings.heroHeading}
        subheading={settings.heroSubheading}
        imageUrl={settings.heroImageUrl}
        imageAlt={settings.heroImageAlt}
        makes={makes.map((m) => m.make)}
        bodyTypes={sortedBodyTypes}
        currency={settings.currency}
        locale={settings.locale}
        availableCount={availableCount}
      />
      <StatsBand stats={stats} locale={settings.locale} />
      <VehicleShowcase
        eyebrow="Featured collection"
        title="Selected for the discerning driver"
        vehicles={featured}
        format={format}
        linkLabel="View full inventory"
        linkHref="/inventory"
      />
      <CategoryGrid categories={categories} />
      <WhyChoose />
      <AboutEditorial
        heading={settings.aboutHeading}
        story={settings.aboutStory}
        mission={settings.mission}
        imageUrl={settings.aboutImageUrl}
      />
      <PromoBanner
        eyebrow={settings.promoEyebrow}
        heading={settings.promoHeading}
        body={settings.promoBody}
        ctaText={settings.promoCtaText}
        ctaUrl={settings.promoCtaUrl}
        imageUrl={settings.promoImageUrl}
      />
      <ServicesGrid />
      <Testimonials items={testimonials} />
      <HowItWorks />
      <VehicleShowcase
        eyebrow="Latest arrivals"
        title="New to the showroom"
        vehicles={latest}
        format={format}
        linkLabel="See all new arrivals"
        linkHref="/inventory?sort=newest"
        columns={4}
      />
      <FaqSection faqs={faqs} />
      <ContactCta
        whatsappHref={whatsappHref}
        phoneHref={telLink(settings.phone)}
        phone={settings.phone}
        email={settings.email}
      />
    </>
  );
}
