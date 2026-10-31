import Link from "next/link";
import type { PublicSettings } from "@/lib/settings";
import { footerCompanyNav, footerShowroomNav } from "@/lib/navigation";
import { telLink } from "@/lib/whatsapp";
import { NewsletterForm } from "./newsletter-form";

export function SiteFooter({ settings }: { settings: PublicSettings }) {
  const socials = [
    { label: "Instagram", href: settings.instagramUrl },
    { label: "Facebook", href: settings.facebookUrl },
    { label: "X", href: settings.xUrl },
    { label: "YouTube", href: settings.youtubeUrl },
    { label: "TikTok", href: settings.tiktokUrl },
    { label: "LinkedIn", href: settings.linkedinUrl },
  ].filter((s): s is { label: string; href: string } => Boolean(s.href));

  const phoneHref = telLink(settings.phone);
  const address = [settings.addressLine, settings.city, settings.country].filter(Boolean).join(", ");
  const hasVisitInfo = Boolean(address || settings.openingHoursRows.length || settings.phone || settings.email);

  return (
    <footer className="bg-obsidian text-mist">
      <div className="mx-auto flex max-w-content flex-col gap-16 px-6 pb-10 pt-20">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1.2fr_1.4fr]">
          <div className="flex flex-col gap-5">
            <span className="flex flex-col gap-0.5 text-white">
              <span className="font-display text-2xl tracking-[0.18em]">BALINGER</span>
              <span className="text-[10px] font-semibold tracking-[0.62em] text-champagne">AUTOS</span>
            </span>
            <p className="max-w-[16rem] text-sm leading-relaxed">{settings.footerText ?? settings.tagline}</p>
          </div>

          <nav aria-label="Showroom" className="flex flex-col gap-3 text-sm">
            <h2 className="mb-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white">Showroom</h2>
            {footerShowroomNav.map((item) => (
              <Link key={item.label} href={item.href} className="transition-colors hover:text-champagne">
                {item.label}
              </Link>
            ))}
          </nav>

          <nav aria-label="Company" className="flex flex-col gap-3 text-sm">
            <h2 className="mb-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white">Company</h2>
            {footerCompanyNav.map((item) => (
              <Link key={item.label} href={item.href} className="transition-colors hover:text-champagne">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-3 text-sm leading-relaxed">
            <h2 className="mb-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white">Visit</h2>
            {hasVisitInfo ? (
              <>
                {address ? <address className="not-italic">{address}</address> : null}
                {settings.openingHoursRows.map((row) => (
                  <span key={row.days}>
                    {row.days}: {row.hours}
                  </span>
                ))}
                {phoneHref ? (
                  <a href={phoneHref} className="transition-colors hover:text-champagne">
                    {settings.phone}
                  </a>
                ) : null}
                {settings.email ? (
                  <a href={`mailto:${settings.email}`} className="transition-colors hover:text-champagne">
                    {settings.email}
                  </a>
                ) : null}
              </>
            ) : (
              <span>Showroom details coming soon.</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="mb-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white">New arrivals, first</h2>
            <NewsletterForm />
          </div>
        </div>

        <div className="flex flex-col justify-between gap-5 border-t border-graphite-line pt-7 text-[13px] text-mist-dim sm:flex-row">
          <span>
            © {new Date().getFullYear()} {settings.businessName}.
            {settings.businessRegistration ? ` ${settings.businessRegistration}` : ""}
          </span>
          {socials.length > 0 ? (
            <ul className="flex flex-wrap gap-6">
              {socials.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-champagne">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
