"use client";

import { updateSettings } from "@/app/admin/actions/content";
import { AdminForm, aInput, aTextarea, AField } from "@/components/admin/admin-form";
import { ContentImageField } from "@/components/admin/content-image-field";

export function ContactSettingsForm({ s }: { s: Record<"businessName" | "tagline" | "phone" | "whatsappNumber" | "email" | "addressLine" | "city" | "country" | "mapEmbedUrl" | "openingHours", string> }) {
  return (
    <AdminForm action={(fd) => updateSettings("contact", fd)}>
      {(e) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <AField label="Business name" error={e.businessName}><input name="businessName" defaultValue={s.businessName} className={aInput} /></AField>
            <AField label="Tagline" error={e.tagline}><input name="tagline" defaultValue={s.tagline} className={aInput} /></AField>
            <AField label="Phone" error={e.phone} hint="As customers should see it, e.g. +234 801 234 5678"><input name="phone" defaultValue={s.phone} className={aInput} /></AField>
            <AField label="WhatsApp number" error={e.whatsappNumber} hint="Digits only with country code, e.g. 2348012345678"><input name="whatsappNumber" defaultValue={s.whatsappNumber} className={aInput} /></AField>
            <AField label="Public email" error={e.email}><input name="email" type="email" defaultValue={s.email} className={aInput} /></AField>
            <AField label="Street address" error={e.addressLine}><input name="addressLine" defaultValue={s.addressLine} className={aInput} /></AField>
            <AField label="City" error={e.city}><input name="city" defaultValue={s.city} className={aInput} /></AField>
            <AField label="Country" error={e.country}><input name="country" defaultValue={s.country} className={aInput} /></AField>
          </div>
          <AField label="Google Maps embed URL" error={e.mapEmbedUrl} hint="Google Maps → Share → Embed a map → copy only the src=&quot;…&quot; link.">
            <input name="mapEmbedUrl" defaultValue={s.mapEmbedUrl} className={aInput} />
          </AField>
          <AField label="Opening hours" error={e.openingHours} hint="One line per row: Days | Hours, e.g. Mon – Fri | 9:00 – 18:00">
            <textarea name="openingHours" rows={4} defaultValue={s.openingHours} className={aTextarea} />
          </AField>
        </>
      )}
    </AdminForm>
  );
}

export function SocialSettingsForm({ s }: { s: Record<"instagramUrl" | "facebookUrl" | "xUrl" | "youtubeUrl" | "tiktokUrl" | "linkedinUrl", string> }) {
  const fields = [
    ["instagramUrl", "Instagram"],
    ["facebookUrl", "Facebook"],
    ["xUrl", "X (Twitter)"],
    ["youtubeUrl", "YouTube"],
    ["tiktokUrl", "TikTok"],
    ["linkedinUrl", "LinkedIn"],
  ] as const;
  return (
    <AdminForm action={(fd) => updateSettings("social", fd)}>
      {(e) => (
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(([name, label]) => (
            <AField key={name} label={label} error={e[name]}>
              <input name={name} defaultValue={s[name]} placeholder="https://" className={aInput} />
            </AField>
          ))}
        </div>
      )}
    </AdminForm>
  );
}

export function FooterSettingsForm({ s }: { s: { footerText: string; businessRegistration: string } }) {
  return (
    <AdminForm action={(fd) => updateSettings("footer", fd)}>
      {(e) => (
        <>
          <AField label="Footer text" error={e.footerText}><textarea name="footerText" rows={2} defaultValue={s.footerText} className={aTextarea} /></AField>
          <AField label="Business registration" error={e.businessRegistration} hint="e.g. RC 1234567"><input name="businessRegistration" defaultValue={s.businessRegistration} className={aInput} /></AField>
        </>
      )}
    </AdminForm>
  );
}

export function SeoSettingsForm({ s, uploadsEnabled }: { s: { seoTitle: string; seoDescription: string; ogImageUrl: string | null }; uploadsEnabled: boolean }) {
  return (
    <AdminForm action={(fd) => updateSettings("seo", fd)}>
      {(e) => (
        <>
          <AField label="Default page title" error={e.seoTitle} hint="Up to 70 characters."><input name="seoTitle" maxLength={70} defaultValue={s.seoTitle} className={aInput} /></AField>
          <AField label="Default description" error={e.seoDescription} hint="Up to 170 characters."><textarea name="seoDescription" maxLength={170} rows={3} defaultValue={s.seoDescription} className={aTextarea} /></AField>
          <ContentImageField name="ogImageUrl" label="Social sharing image (1200 × 630)" initialUrl={s.ogImageUrl} uploadsEnabled={uploadsEnabled} error={e.ogImageUrl} />
        </>
      )}
    </AdminForm>
  );
}

export function RegionalSettingsForm({ s }: { s: { currency: string; locale: string; mileageUnit: string; timezone: string; altCurrencies: string; altCurrenciesNote: string; assistantEnabled: boolean } }) {
  return (
    <AdminForm action={(fd) => updateSettings("regional", fd)}>
      {(e) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <AField label="Default currency" error={e.currency} hint="Used for new vehicles and form labels."><input name="currency" maxLength={3} defaultValue={s.currency} className={aInput} /></AField>
            <AField label="Number format (locale)" error={e.locale} hint="en-NG formats prices as ₦95,000,000"><input name="locale" defaultValue={s.locale} className={aInput} /></AField>
            <AField label="Mileage unit" error={e.mileageUnit}>
              <select name="mileageUnit" defaultValue={s.mileageUnit} className={aInput}>
                <option value="km">Kilometres (km)</option>
                <option value="mi">Miles (mi)</option>
              </select>
            </AField>
            <AField label="Showroom time zone" error={e.timezone} hint="Used for test-drive times, e.g. Africa/Lagos"><input name="timezone" defaultValue={s.timezone} className={aInput} /></AField>
          </div>
          <AField label="Approximate prices in other currencies" error={e.altCurrencies} hint="One per line: CODE=rate per ₦1, e.g. USD=0.00065. Leave empty to turn off.">
            <textarea name="altCurrencies" rows={3} defaultValue={s.altCurrencies} className={aTextarea} />
          </AField>
          <AField label="Note under converted prices" error={e.altCurrenciesNote} hint="e.g. Indicative only, rates updated weekly.">
            <input name="altCurrenciesNote" defaultValue={s.altCurrenciesNote} className={aInput} />
          </AField>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="assistantEnabled" defaultChecked={s.assistantEnabled} className="h-4 w-4 accent-obsidian" />
            Show the AI assistant on the website (requires ANTHROPIC_API_KEY)
          </label>
        </>
      )}
    </AdminForm>
  );
}

export function PaymentSettingsForm({ s }: { s: { reservationDepositEnabled: boolean; reservationDepositAmount: number; reservationHoldDays: number } }) {
  return (
    <AdminForm action={(fd) => updateSettings("payments", fd)}>
      {(e) => (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="reservationDepositEnabled" defaultChecked={s.reservationDepositEnabled} className="h-4 w-4 accent-obsidian" />
            Let customers reserve available vehicles online with a Paystack deposit
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <AField label="Deposit amount (₦)" error={e.reservationDepositAmount} hint="Whole naira, e.g. 500000. Never more than the vehicle price.">
              <input name="reservationDepositAmount" inputMode="numeric" defaultValue={s.reservationDepositAmount} className={aInput} />
            </AField>
            <AField label="Hold period (days)" error={e.reservationHoldDays} hint="How long the vehicle stays reserved after payment.">
              <input name="reservationHoldDays" inputMode="numeric" defaultValue={s.reservationHoldDays} className={aInput} />
            </AField>
          </div>
          <p className="text-xs text-ink-muted">
            Only vehicles priced in NGN, marked Available and not “price on request” show the online option. Paystack webhook URL:{" "}
            <code className="bg-ivory px-1">/api/paystack/webhook</code>
          </p>
        </>
      )}
    </AdminForm>
  );
}
