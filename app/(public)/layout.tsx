import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { FloatingActions } from "@/components/layout/floating-actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { isAssistantConfigured } from "@/lib/ai/assistant";
import { getSiteSettings } from "@/lib/settings";
import { telLink, whatsappLink } from "@/lib/whatsapp";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  const whatsappHref = whatsappLink(settings.whatsappNumber, `Hello ${settings.businessName}, I'd like to speak with your team.`);

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 bg-champagne px-4 py-3 font-semibold text-obsidian focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <AnnouncementBar text={settings.announcementText} linkText={settings.announcementLinkText} linkUrl={settings.announcementLinkUrl} />
      <SiteHeader phoneHref={telLink(settings.phone)} phoneLabel={settings.phone} whatsappHref={whatsappHref} />
      <main id="main">{children}</main>
      <SiteFooter settings={settings} />
      <FloatingActions whatsappHref={whatsappHref} assistantEnabled={isAssistantConfigured() && settings.assistantEnabled} />
    </>
  );
}
