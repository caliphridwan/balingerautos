import { Card, PageHeader } from "@/components/admin/ui";
import { requirePage } from "@/lib/auth/guards";
import { isAssistantConfigured } from "@/lib/ai/assistant";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { parseAltCurrencies } from "@/lib/currency";
import { getSiteSettings } from "@/lib/settings";
import { ContactSettingsForm, FooterSettingsForm, PaymentSettingsForm, RegionalSettingsForm, SeoSettingsForm, SocialSettingsForm } from "./settings-forms";
import { isPaystackConfigured, isPaystackTestMode } from "@/lib/paystack";
import { absoluteUrl } from "@/lib/utils";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requirePage("settings:write");
  const s = await getSiteSettings();
  const integrations = [
    { name: "Cloudinary (image uploads)", on: isCloudinaryConfigured() },
    { name: "Resend (email)", on: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM) },
    { name: `Paystack (payments)${isPaystackTestMode() ? " — TEST MODE" : ""}`, on: isPaystackConfigured() },
    { name: "AI assistant", on: isAssistantConfigured() },
    { name: "Staff notification email", on: Boolean(process.env.ADMIN_NOTIFICATION_EMAIL || s.email) },
  ];

  return (
    <>
      <PageHeader title="Settings" description="Business details, contact channels, SEO and regional settings." />
      <Card title="Integrations" className="mb-6">
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {integrations.map((i) => (
            <li key={i.name} className="flex items-center gap-2">
              <span aria-hidden="true" className={i.on ? "h-2 w-2 bg-[#1E4A2E]" : "h-2 w-2 bg-[#B4412F]"} />
              {i.name}: <strong>{i.on ? "configured" : "not configured"}</strong>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-muted">Integrations are configured with environment variables on your server (see .env.example).</p>
      </Card>
      <div className="grid gap-6 2xl:grid-cols-2">
        <Card title="Business & contact">
          <ContactSettingsForm
            s={{
              businessName: s.businessName,
              tagline: s.tagline,
              phone: s.phone ?? "",
              whatsappNumber: s.whatsappNumber ?? "",
              email: s.email ?? "",
              addressLine: s.addressLine ?? "",
              city: s.city ?? "",
              country: s.country ?? "",
              mapEmbedUrl: s.mapEmbedUrl ?? "",
              openingHours: s.openingHoursRows.map((r) => `${r.days} | ${r.hours}`).join("\n"),
            }}
          />
        </Card>
        <div className="flex flex-col gap-6">
          <Card title="Social media">
            <SocialSettingsForm
              s={{ instagramUrl: s.instagramUrl ?? "", facebookUrl: s.facebookUrl ?? "", xUrl: s.xUrl ?? "", youtubeUrl: s.youtubeUrl ?? "", tiktokUrl: s.tiktokUrl ?? "", linkedinUrl: s.linkedinUrl ?? "" }}
            />
          </Card>
          <Card title="Footer">
            <FooterSettingsForm s={{ footerText: s.footerText ?? "", businessRegistration: s.businessRegistration ?? "" }} />
          </Card>
        </div>
        <div id="payments" className="scroll-mt-24">
          <Card title="Online payments (Paystack)">
            <PaymentSettingsForm
              s={{
                reservationDepositEnabled: s.reservationDepositEnabled,
                reservationDepositAmount: Number(s.reservationDepositAmount),
                reservationHoldDays: s.reservationHoldDays,
              }}
            />
            <p className="mt-3 text-xs text-ink-muted">
              In Paystack → Settings → API Keys &amp; Webhooks, set the webhook URL to <code className="bg-ivory px-1">{absoluteUrl("/api/paystack/webhook")}</code>.
            </p>
          </Card>
        </div>
        <Card title="SEO defaults">
          <SeoSettingsForm s={{ seoTitle: s.seoTitle ?? "", seoDescription: s.seoDescription ?? "", ogImageUrl: s.ogImageUrl }} uploadsEnabled={isCloudinaryConfigured()} />
        </Card>
        <Card title="Regional & features">
          <RegionalSettingsForm
            s={{
              currency: s.currency,
              locale: s.locale,
              mileageUnit: s.mileageUnit,
              timezone: s.timezone,
              altCurrencies: parseAltCurrencies(s.altCurrencies).map((a) => `${a.code}=${a.rate}`).join("\n"),
              altCurrenciesNote: s.altCurrenciesNote ?? "",
              assistantEnabled: s.assistantEnabled,
            }}
          />
        </Card>
      </div>
    </>
  );
}
