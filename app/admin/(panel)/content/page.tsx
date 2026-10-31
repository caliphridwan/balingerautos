import Link from "next/link";
import { Card, PageHeader } from "@/components/admin/ui";
import { requirePage } from "@/lib/auth/guards";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { AboutForm, HomepageForm } from "./content-forms";

export const metadata = { title: "Content" };

export default async function ContentPage() {
  await requirePage("content:write");
  const [settings, counts] = await Promise.all([
    getSiteSettings(),
    Promise.all([prisma.testimonial.count(), prisma.fAQ.count(), prisma.teamMember.count(), prisma.vehicleCategory.count()]),
  ]);
  const uploads = isCloudinaryConfigured();
  // Only plain values cross into client components (no Decimal/Date/Json).
  const formValues = {
    announcementText: settings.announcementText,
    announcementLinkText: settings.announcementLinkText,
    announcementLinkUrl: settings.announcementLinkUrl,
    heroEyebrow: settings.heroEyebrow,
    heroHeading: settings.heroHeading,
    heroSubheading: settings.heroSubheading,
    heroImageUrl: settings.heroImageUrl,
    heroImageAlt: settings.heroImageAlt,
    promoEyebrow: settings.promoEyebrow,
    promoHeading: settings.promoHeading,
    promoBody: settings.promoBody,
    promoCtaText: settings.promoCtaText,
    promoCtaUrl: settings.promoCtaUrl,
    promoImageUrl: settings.promoImageUrl,
    statVehiclesSold: settings.statVehiclesSold,
    statCustomers: settings.statCustomers,
    statYearsExperience: settings.statYearsExperience,
    statLiveAvailability: settings.statLiveAvailability,
    aboutHeading: settings.aboutHeading,
    aboutStory: settings.aboutStory,
    mission: settings.mission,
    vision: settings.vision,
    aboutImageUrl: settings.aboutImageUrl,
  };
  const links = [
    { href: "/admin/content/testimonials", label: "Testimonials", count: counts[0] },
    { href: "/admin/content/faqs", label: "FAQs", count: counts[1] },
    { href: "/admin/content/team", label: "Team", count: counts[2] },
    { href: "/admin/content/categories", label: "Vehicle categories", count: counts[3] },
  ];

  return (
    <>
      <PageHeader title="Content" description="Everything here updates the live website as soon as you save." />
      <ul className="mb-8 grid gap-px border border-ivory-line bg-ivory-line sm:grid-cols-2 xl:grid-cols-4">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="flex items-center justify-between bg-white px-5 py-5 hover:bg-ivory">
              <span className="font-semibold">{l.label}</span>
              <span className="text-sm text-ink-muted">{l.count}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="grid gap-6 2xl:grid-cols-2">
        <Card title="Homepage">
          <HomepageForm settings={formValues} uploadsEnabled={uploads} />
        </Card>
        <Card title="About page">
          <AboutForm settings={formValues} uploadsEnabled={uploads} />
        </Card>
      </div>
    </>
  );
}
