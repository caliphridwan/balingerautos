"use client";

import type { SiteSettings } from "@prisma/client";
import { updateSettings } from "@/app/admin/actions/content";
import { AdminForm, aInput, aTextarea, AField } from "@/components/admin/admin-form";
import { ContentImageField } from "@/components/admin/content-image-field";

type S = Pick<
  SiteSettings,
  | "announcementText" | "announcementLinkText" | "announcementLinkUrl" | "heroEyebrow" | "heroHeading" | "heroSubheading" | "heroImageUrl" | "heroImageAlt"
  | "promoEyebrow" | "promoHeading" | "promoBody" | "promoCtaText" | "promoCtaUrl" | "promoImageUrl"
  | "statVehiclesSold" | "statCustomers" | "statYearsExperience" | "statLiveAvailability"
  | "aboutHeading" | "aboutStory" | "mission" | "vision" | "aboutImageUrl"
>;

export function HomepageForm({ settings: s, uploadsEnabled }: { settings: S; uploadsEnabled: boolean }) {
  return (
    <AdminForm action={(fd) => updateSettings("homepage", fd)}>
      {(e) => (
        <>
          <fieldset className="grid gap-4">
            <legend className="mb-2 font-display text-lg">Announcement bar</legend>
            <AField label="Text" error={e.announcementText} hint="Leave empty to hide the bar.">
              <input name="announcementText" defaultValue={s.announcementText ?? ""} className={aInput} />
            </AField>
            <div className="grid gap-4 sm:grid-cols-2">
              <AField label="Link text" error={e.announcementLinkText}><input name="announcementLinkText" defaultValue={s.announcementLinkText ?? ""} className={aInput} /></AField>
              <AField label="Link URL" error={e.announcementLinkUrl} hint="e.g. /contact"><input name="announcementLinkUrl" defaultValue={s.announcementLinkUrl ?? ""} className={aInput} /></AField>
            </div>
          </fieldset>

          <fieldset className="grid gap-4 border-t border-ivory-soft pt-5">
            <legend className="mb-2 font-display text-lg">Hero</legend>
            <AField label="Eyebrow" error={e.heroEyebrow}><input name="heroEyebrow" defaultValue={s.heroEyebrow} className={aInput} /></AField>
            <AField label="Heading" error={e.heroHeading} hint="The second sentence is set in italic gold."><input name="heroHeading" defaultValue={s.heroHeading} className={aInput} /></AField>
            <AField label="Supporting text" error={e.heroSubheading}><textarea name="heroSubheading" rows={3} defaultValue={s.heroSubheading} className={aTextarea} /></AField>
            <ContentImageField name="heroImageUrl" label="Hero image (wide, at least 2400px)" initialUrl={s.heroImageUrl} uploadsEnabled={uploadsEnabled} error={e.heroImageUrl} />
            <AField label="Hero image description (alt text)" error={e.heroImageAlt}><input name="heroImageAlt" defaultValue={s.heroImageAlt ?? ""} className={aInput} /></AField>
          </fieldset>

          <fieldset className="grid gap-4 border-t border-ivory-soft pt-5">
            <legend className="mb-2 font-display text-lg">Statistics</legend>
            <p className="text-sm text-ink-muted">Leave a figure empty to hide it. Only enter numbers you can stand behind.</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="statLiveAvailability" defaultChecked={s.statLiveAvailability} className="h-4 w-4 accent-obsidian" />
              Show “Vehicles available”, counted live from inventory
            </label>
            <div className="grid gap-4 sm:grid-cols-3">
              <AField label="Vehicles sold" error={e.statVehiclesSold}><input name="statVehiclesSold" inputMode="numeric" defaultValue={s.statVehiclesSold ?? ""} className={aInput} /></AField>
              <AField label="Satisfied customers" error={e.statCustomers}><input name="statCustomers" inputMode="numeric" defaultValue={s.statCustomers ?? ""} className={aInput} /></AField>
              <AField label="Years of experience" error={e.statYearsExperience}><input name="statYearsExperience" inputMode="numeric" defaultValue={s.statYearsExperience ?? ""} className={aInput} /></AField>
            </div>
          </fieldset>

          <fieldset className="grid gap-4 border-t border-ivory-soft pt-5">
            <legend className="mb-2 font-display text-lg">Promotional banner</legend>
            <p className="text-sm text-ink-muted">Leave the heading empty to hide the banner.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <AField label="Eyebrow" error={e.promoEyebrow}><input name="promoEyebrow" defaultValue={s.promoEyebrow ?? ""} className={aInput} /></AField>
              <AField label="Heading" error={e.promoHeading}><input name="promoHeading" defaultValue={s.promoHeading ?? ""} className={aInput} /></AField>
            </div>
            <AField label="Text" error={e.promoBody}><textarea name="promoBody" rows={2} defaultValue={s.promoBody ?? ""} className={aTextarea} /></AField>
            <div className="grid gap-4 sm:grid-cols-2">
              <AField label="Button text" error={e.promoCtaText}><input name="promoCtaText" defaultValue={s.promoCtaText ?? ""} className={aInput} /></AField>
              <AField label="Button link" error={e.promoCtaUrl} hint="e.g. /trade-in"><input name="promoCtaUrl" defaultValue={s.promoCtaUrl ?? ""} className={aInput} /></AField>
            </div>
            <ContentImageField name="promoImageUrl" label="Banner image (optional)" initialUrl={s.promoImageUrl} uploadsEnabled={uploadsEnabled} error={e.promoImageUrl} />
          </fieldset>
        </>
      )}
    </AdminForm>
  );
}

export function AboutForm({ settings: s, uploadsEnabled }: { settings: S; uploadsEnabled: boolean }) {
  return (
    <AdminForm action={(fd) => updateSettings("about", fd)}>
      {(e) => (
        <>
          <AField label="Heading" error={e.aboutHeading}><input name="aboutHeading" defaultValue={s.aboutHeading ?? ""} className={aInput} /></AField>
          <AField label="Our story" error={e.aboutStory} hint="Separate paragraphs with a blank line."><textarea name="aboutStory" rows={9} defaultValue={s.aboutStory ?? ""} className={aTextarea} /></AField>
          <AField label="Mission" error={e.mission}><textarea name="mission" rows={3} defaultValue={s.mission} className={aTextarea} /></AField>
          <AField label="Vision" error={e.vision}><textarea name="vision" rows={3} defaultValue={s.vision} className={aTextarea} /></AField>
          <ContentImageField name="aboutImageUrl" label="About image" initialUrl={s.aboutImageUrl} uploadsEnabled={uploadsEnabled} error={e.aboutImageUrl} />
        </>
      )}
    </AdminForm>
  );
}
