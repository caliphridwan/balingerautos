import type { Metadata } from "next";
import { SafeImage } from "@/components/shared/safe-image";
import { PageHero } from "@/components/shared/page-hero";
import { Reveal } from "@/components/shared/reveal";
import { SectionHeading } from "@/components/shared/section-heading";
import { ButtonLink } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "About Us",
  description: "Our story, mission and the standards behind every vehicle we offer.",
  alternates: { canonical: "/about" },
};

const values = [
  { title: "Integrity", body: "Honest descriptions, clear pricing and advice we'd give our own family." },
  { title: "Excellence", body: "Every vehicle is chosen, inspected and presented to a high standard." },
  { title: "Transparency", body: "Full specifications, condition notes and history, shared openly." },
  { title: "Care", body: "We listen first, and fit the process around your schedule." },
];

const commitments = [
  { title: "Selected, not just stocked", body: "We choose vehicles for their history, condition and specification — and turn many away." },
  { title: "Inspected and verified", body: "Each vehicle is checked and its documents verified before it is listed." },
  { title: "Presented honestly", body: "Photography and descriptions show the vehicle as it is, including its condition notes." },
];

const philosophy = [
  { title: "One point of contact", body: "A named member of our team guides you from first enquiry to handover." },
  { title: "Your pace", body: "Browse online, visit by appointment, or complete most of the journey remotely." },
  { title: "After you drive away", body: "We stay available for questions, servicing advice and your next vehicle." },
];

export default async function AboutPage() {
  const [settings, team] = await Promise.all([
    getSiteSettings(),
    prisma.teamMember.findMany({ where: { isPublished: true }, orderBy: { position: "asc" } }),
  ]);

  return (
    <>
      <PageHero
        eyebrow="About Balinger Autos"
        title={settings.aboutHeading ?? "Redefining how exceptional cars are bought"}
        breadcrumb={[{ label: "Home", href: "/" }, { label: "About" }]}
      />

      <section className="bg-ivory">
        <div className="mx-auto flex max-w-content flex-col gap-14 px-6 py-24 lg:flex-row lg:items-start">
          <div className="flex flex-col gap-6 lg:w-1/2">
            <span className="eyebrow text-deepgold">Our story</span>
            {settings.aboutStory ? (
              <div className="flex flex-col gap-5 text-[17px] leading-[1.8] text-ink-body">
                {settings.aboutStory.split(/\n{2,}/).map((p) => (
                  <p key={p.slice(0, 40)}>{p}</p>
                ))}
              </div>
            ) : (
              <p className="text-[17px] leading-[1.8] text-ink-body">
                Balinger Autos was founded on a simple belief: buying an exceptional vehicle should feel as considered as the
                vehicle itself.
              </p>
            )}
          </div>
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#D9D5CA] lg:w-1/2">
            {settings.aboutImageUrl ? (
              <SafeImage src={settings.aboutImageUrl} alt="" fill sizes="(min-width: 1024px) 600px, 100vw" className="object-cover" />
            ) : (
              <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(16,17,20,0.04)_0_1px,transparent_1px_20px)]" />
            )}
          </div>
        </div>
      </section>

      <section className="bg-obsidian text-white">
        <div className="mx-auto grid max-w-content gap-14 px-6 py-24 md:grid-cols-2">
          <Reveal className="flex flex-col gap-5 border-t border-graphite-line pt-8">
            <span className="eyebrow text-champagne">Our mission</span>
            <p className="font-display text-[clamp(1.5rem,2.4vw,2rem)] leading-snug">{settings.mission}</p>
          </Reveal>
          <Reveal delay={0.1} className="flex flex-col gap-5 border-t border-graphite-line pt-8">
            <span className="eyebrow text-champagne">Our vision</span>
            <p className="font-display text-[clamp(1.5rem,2.4vw,2rem)] leading-snug">{settings.vision}</p>
          </Reveal>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto flex max-w-content flex-col gap-12 px-6 py-24">
          <SectionHeading eyebrow="Our core values" title="What guides every decision" />
          <ul className="grid gap-px border border-ivory-line bg-ivory-line sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <li key={v.title} className="flex flex-col gap-3 bg-white p-8">
                <h3 className="font-display text-2xl">{v.title}</h3>
                <p className="text-[15px] leading-relaxed text-ink-body">{v.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-ivory">
        <div className="mx-auto grid max-w-content gap-16 px-6 py-24 lg:grid-cols-2">
          <div className="flex flex-col gap-8">
            <SectionHeading eyebrow="Our commitment to quality" title="Standards before showroom" />
            <ol className="flex flex-col border-t border-obsidian">
              {commitments.map((c, i) => (
                <li key={c.title} className="flex gap-6 border-b border-ivory-line py-6">
                  <span className="font-display text-2xl text-deepgold">{String(i + 1).padStart(2, "0")}</span>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-lg font-semibold">{c.title}</h3>
                    <p className="text-[15px] leading-relaxed text-ink-body">{c.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col gap-8">
            <SectionHeading eyebrow="Our customer experience" title="A purchase that feels personal" />
            <ul className="flex flex-col border-t border-obsidian">
              {philosophy.map((c) => (
                <li key={c.title} className="flex flex-col gap-1.5 border-b border-ivory-line py-6">
                  <h3 className="text-lg font-semibold">{c.title}</h3>
                  <p className="text-[15px] leading-relaxed text-ink-body">{c.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {team.length > 0 ? (
        <section className="bg-white">
          <div className="mx-auto flex max-w-content flex-col gap-12 px-6 py-24">
            <SectionHeading eyebrow="Our team" title="The people behind Balinger Autos" />
            <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {team.map((m) => (
                <li key={m.id} className="flex flex-col gap-4">
                  <div className="relative aspect-[4/5] overflow-hidden bg-ivory-soft">
                    {m.photoUrl ? <SafeImage src={m.photoUrl} alt={m.name} fill sizes="(min-width: 1024px) 300px, 50vw" className="object-cover" /> : null}
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-display text-xl">{m.name}</h3>
                    <span className="text-sm text-deepgold">{m.role}</span>
                    {m.bio ? <p className="mt-2 text-sm leading-relaxed text-ink-body">{m.bio}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="bg-graphite text-white">
        <div className="mx-auto flex max-w-content flex-col items-start justify-between gap-8 px-6 py-20 md:flex-row md:items-center">
          <h2 className="heading-display max-w-2xl text-[clamp(1.9rem,3.6vw,2.8rem)]">Let's find the right vehicle for you.</h2>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/contact" variant="gold" size="lg">
              Speak with our team
            </ButtonLink>
            <ButtonLink href="/inventory" variant="outline-light" size="lg">
              Browse inventory
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
