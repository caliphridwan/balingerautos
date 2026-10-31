import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { ContactForm } from "@/components/forms/contact-form";
import { PageHero } from "@/components/shared/page-hero";
import { getSiteSettings } from "@/lib/settings";
import { CONTACT_FORM_CATEGORIES } from "@/lib/validations/leads";
import { telLink, whatsappLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Call, WhatsApp, email or visit the Balinger Autos showroom.",
  alternates: { canonical: "/contact" },
};

/** Only Google Maps embed URLs are rendered in the iframe. */
function safeMapUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (u.hostname === "www.google.com" || u.hostname === "maps.google.com") && u.pathname.startsWith("/maps/embed")
      ? u.toString()
      : null;
  } catch {
    return null;
  }
}

export default async function ContactPage({ searchParams }: { searchParams: { category?: string } }) {
  const settings = await getSiteSettings();
  const phoneHref = telLink(settings.phone);
  const whatsappHref = whatsappLink(settings.whatsappNumber, `Hello ${settings.businessName}, I'd like to speak with your team.`);
  const address = [settings.addressLine, settings.city, settings.country].filter(Boolean).join(", ");
  const mapUrl = safeMapUrl(settings.mapEmbedUrl);
  const category = (CONTACT_FORM_CATEGORIES as readonly string[]).includes(searchParams.category?.toUpperCase() ?? "")
    ? (searchParams.category!.toUpperCase() as (typeof CONTACT_FORM_CATEGORIES)[number])
    : undefined;

  const socials = [
    { label: "Instagram", href: settings.instagramUrl },
    { label: "Facebook", href: settings.facebookUrl },
    { label: "X", href: settings.xUrl },
    { label: "YouTube", href: settings.youtubeUrl },
    { label: "TikTok", href: settings.tiktokUrl },
    { label: "LinkedIn", href: settings.linkedinUrl },
  ].filter((s): s is { label: string; href: string } => Boolean(s.href));

  const channels = [
    phoneHref && settings.phone ? { icon: Phone, label: "Call", value: settings.phone, href: phoneHref, external: false } : null,
    whatsappHref ? { icon: MessageCircle, label: "WhatsApp", value: "Chat with our team", href: whatsappHref, external: true } : null,
    settings.email ? { icon: Mail, label: "Email", value: settings.email, href: `mailto:${settings.email}`, external: false } : null,
  ].filter((c): c is NonNullable<typeof c> => c !== null);

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Speak with our team"
        description="Call, message or visit. A member of our sales team will respond personally."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Contact" }]}
      />

      <section className="bg-ivory">
        <div className="mx-auto grid max-w-content gap-14 px-6 py-20 lg:grid-cols-[1fr_1.2fr]">
          <div className="flex flex-col gap-10">
            {channels.length > 0 ? (
              <ul className="flex flex-col border-t border-obsidian">
                {channels.map(({ icon: Icon, label, value, href, external }) => (
                  <li key={label} className="border-b border-ivory-line">
                    <a
                      href={href}
                      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="group flex min-h-[72px] items-center gap-5 py-4"
                    >
                      <Icon aria-hidden="true" className="h-5 w-5 text-deepgold" strokeWidth={1.5} />
                      <span className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">{label}</span>
                        <span className="text-lg font-semibold group-hover:text-deepgold">{value}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}

            {address ? (
              <div className="flex gap-5">
                <MapPin aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-deepgold" strokeWidth={1.5} />
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">Showroom</span>
                  <address className="text-[17px] not-italic leading-relaxed">{address}</address>
                </div>
              </div>
            ) : null}

            {settings.openingHoursRows.length > 0 ? (
              <div className="flex gap-5">
                <Clock aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-deepgold" strokeWidth={1.5} />
                <div className="flex w-full flex-col gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">Opening hours</span>
                  <dl className="flex flex-col">
                    {settings.openingHoursRows.map((r) => (
                      <div key={r.days} className="flex justify-between gap-4 border-b border-ivory-line py-2 text-[15px]">
                        <dt>{r.days}</dt>
                        <dd className="font-semibold">{r.hours}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            ) : null}

            {socials.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {socials.map((s) => (
                  <li key={s.label}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[40px] items-center border border-[#D4D1C8] bg-white px-4 text-sm font-semibold hover:border-obsidian">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}

            {channels.length === 0 && !address ? (
              <p className="text-ink-body">Our contact details are being updated. Please use the form and we'll reply by email.</p>
            ) : null}
          </div>

          <div className="border border-ivory-line bg-white p-6 sm:p-10">
            <h2 className="heading-display mb-6 text-[30px]">Send us a message</h2>
            <ContactForm defaultCategory={category} />
          </div>
        </div>
      </section>

      {mapUrl ? (
        <section aria-label="Map" className="bg-white">
          <iframe
            src={mapUrl}
            title={`Map showing ${settings.businessName}`}
            className="block h-[420px] w-full border-0 grayscale-[30%]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </section>
      ) : null}
    </>
  );
}
