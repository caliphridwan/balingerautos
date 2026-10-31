import { SafeImage } from "@/components/shared/safe-image";
import Link from "next/link";
import { Plus, Quote } from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/shared/reveal";
import { ButtonLink, TextLink } from "@/components/ui/button";

// ── Why choose ─────────────────────────────────────────────────────────

const reasons = [
  { title: "Carefully Selected Vehicles", body: "Only vehicles that meet our standards for history, condition and specification reach the showroom." },
  { title: "Transparent Pricing", body: "The price you see is clearly stated, with no hidden charges added at the end." },
  { title: "Trusted Automotive Expertise", body: "Advice from people who know these vehicles, not scripts." },
  { title: "Seamless Purchasing Experience", body: "Enquiry, inspection, paperwork and handover, coordinated by one point of contact." },
  { title: "Customer-Focused Service", body: "We work to your schedule, in person or entirely online." },
  { title: "After-Sales Support", body: "Our relationship continues after you drive away." },
];

export function WhyChoose() {
  return (
    <section className="bg-obsidian text-white">
      <div className="mx-auto flex max-w-content flex-col gap-16 px-6 py-24 md:py-28 lg:flex-row">
        <div className="flex flex-col gap-5 lg:w-[38%]">
          <SectionHeading
            tone="dark"
            eyebrow="Why Balinger Autos"
            title="A higher standard, from first look to final handover"
            description="Every vehicle we offer is chosen, inspected and presented with the same care we would expect as buyers ourselves."
          />
        </div>
        <ol className="grid flex-1 gap-x-12 gap-y-10 sm:grid-cols-2">
          {reasons.map((r, i) => (
            <Reveal as="li" key={r.title} delay={i * 0.05} className="flex flex-col gap-3 border-t border-graphite-line pt-6">
              <span className="text-xs font-bold tracking-[0.2em] text-champagne">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="text-[19px] font-semibold">{r.title}</h3>
              <p className="text-[15px] leading-relaxed text-[#A7AAB0]">{r.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ── About ──────────────────────────────────────────────────────────────

export function AboutEditorial({
  heading,
  story,
  mission,
  imageUrl,
}: {
  heading: string | null;
  story: string | null;
  mission: string;
  imageUrl: string | null;
}) {
  return (
    <section id="about" className="scroll-mt-24 bg-ivory">
      <div className="mx-auto flex max-w-content flex-col items-center gap-16 px-6 py-24 md:py-32 lg:flex-row">
        <div className="relative aspect-[4/5] w-full max-w-xl overflow-hidden bg-[#D9D5CA] lg:w-1/2">
          {imageUrl ? (
            <SafeImage src={imageUrl} alt="" fill sizes="(min-width: 1024px) 600px, 100vw" className="object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(16,17,20,0.04)_0_1px,transparent_1px_20px)]" />
          )}
        </div>
        <Reveal className="flex flex-col gap-6 lg:w-1/2">
          <span className="eyebrow text-deepgold">About Balinger Autos</span>
          <h2 className="heading-display text-[clamp(2.1rem,4vw,3.4rem)] leading-[1.08]">
            {heading ?? "Redefining how exceptional cars are bought"}
          </h2>
          {story ? (
            <div className="flex flex-col gap-4 text-[17px] leading-[1.75] text-ink-body">
              {story.split(/\n{2,}/).map((p) => (
                <p key={p.slice(0, 32)}>{p}</p>
              ))}
            </div>
          ) : null}
          <blockquote className="border-l border-obsidian py-1 pl-6 font-display text-[21px] italic leading-relaxed">
            “{mission}”
          </blockquote>
          <TextLink href="/about" className="self-start">
            Read our story
          </TextLink>
        </Reveal>
      </div>
    </section>
  );
}

// ── Promotional banner ────────────────────────────────────────────────

export function PromoBanner({
  eyebrow,
  heading,
  body,
  ctaText,
  ctaUrl,
  imageUrl,
}: {
  eyebrow: string | null;
  heading: string | null;
  body: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  imageUrl: string | null;
}) {
  if (!heading) return null;
  return (
    <section className="relative overflow-hidden bg-graphite text-white">
      {imageUrl ? (
        <>
          <SafeImage src={imageUrl} alt="" fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-obsidian/75" />
        </>
      ) : (
        <div className="texture-hairline absolute inset-0" />
      )}
      <div className="relative mx-auto flex max-w-content flex-col justify-between gap-10 px-6 py-24 md:flex-row md:items-center">
        <div className="flex max-w-2xl flex-col gap-5">
          {eyebrow ? <span className="eyebrow text-champagne">{eyebrow}</span> : null}
          <h2 className="heading-display text-[clamp(2rem,4vw,3.1rem)]">{heading}</h2>
          {body ? <p className="text-[17px] leading-relaxed text-[#C9CBD0]">{body}</p> : null}
        </div>
        {ctaText && ctaUrl ? (
          <ButtonLink href={ctaUrl} variant="gold" size="lg" className="self-start md:self-auto">
            {ctaText}
          </ButtonLink>
        ) : null}
      </div>
    </section>
  );
}

// ── Services ──────────────────────────────────────────────────────────

const services = [
  { title: "New Vehicle Sales", body: "Factory-fresh vehicles in the specification you want.", href: "/services#sales" },
  { title: "Pre-owned Vehicle Sales", body: "Inspected, verified vehicles with documented history.", href: "/services#sales" },
  { title: "Vehicle Sourcing", body: "Tell us the exact car you are after and we will find it.", href: "/services#sourcing" },
  { title: "Vehicle Trade-in", body: "Exchange your current vehicle against your next one.", href: "/trade-in" },
  { title: "Financing Assistance", body: "We help you explore financing options with partner lenders.", href: "/financing" },
  { title: "Inspection & Verification", body: "Independent condition checks and document verification.", href: "/services#inspection" },
];

export function ServicesGrid() {
  return (
    <section id="services" className="scroll-mt-24 bg-white">
      <div className="mx-auto flex max-w-content flex-col gap-12 px-6 py-24 md:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading eyebrow="Our services" title="Everything around the car, handled" />
          <TextLink href="/services">All services</TextLink>
        </div>
        <ul className="grid border-t border-obsidian sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <li key={s.title} className="flex flex-col gap-3.5 border-b border-ivory-line py-9 pr-8">
              <h3 className="font-display text-2xl font-medium">{s.title}</h3>
              <p className="text-[15px] leading-relaxed text-[#4A4D55]">{s.body}</p>
              <Link
                href={s.href}
                className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-deepgold hover:text-obsidian"
              >
                Learn more <span aria-hidden="true">→</span>
                <span className="sr-only"> about {s.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── Testimonials ─────────────────────────────────────────────────────

export function Testimonials({
  items,
}: {
  items: Array<{ id: string; customerName: string; location: string | null; vehicleLabel: string | null; quote: string }>;
}) {
  if (items.length === 0) return null;
  return (
    <section className="bg-ivory">
      <div className="mx-auto flex max-w-content flex-col gap-12 px-6 py-24 md:py-28">
        <SectionHeading eyebrow="Client experiences" title="In our clients’ words" align="center" />
        <ul className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <li key={t.id}>
              <figure className="flex h-full flex-col gap-6 border border-ivory-line bg-white p-9">
                <Quote aria-hidden="true" className="h-7 w-7 text-deepgold" strokeWidth={1.2} />
                <blockquote className="flex-1 font-display text-[19px] leading-relaxed text-[#2A2D33]">{t.quote}</blockquote>
                <figcaption className="flex flex-col gap-1 border-t border-ivory-soft pt-5">
                  <span className="text-[15px] font-bold">{t.customerName}</span>
                  {t.vehicleLabel || t.location ? (
                    <span className="text-[13px] text-ink-muted">
                      {[t.vehicleLabel, t.location].filter(Boolean).join(" · ")}
                    </span>
                  ) : null}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── How it works ─────────────────────────────────────────────────────

const steps = [
  { title: "Discover Your Vehicle", body: "Browse the collection and filter to what matters to you." },
  { title: "Explore the Details", body: "Full specifications, photography and condition notes." },
  { title: "Submit Your Enquiry", body: "Online or on WhatsApp. We reply personally." },
  { title: "Inspect or Test Drive", body: "Book a time that suits you at the showroom." },
  { title: "Complete Your Purchase", body: "Paperwork, payment and handover, handled with care." },
];

export function HowItWorks() {
  return (
    <section className="bg-obsidian text-white">
      <div className="mx-auto flex max-w-content flex-col gap-14 px-6 py-24 md:py-28">
        <SectionHeading tone="dark" eyebrow="How it works" title="Five steps to the keys" />
        <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 0.06} className="flex flex-col gap-4">
              <span className="font-display text-[44px] leading-none text-champagne">{String(i + 1).padStart(2, "0")}</span>
              <span aria-hidden="true" className="h-px bg-graphite-muted" />
              <h3 className="text-[17px] font-semibold">{s.title}</h3>
              <p className="text-sm leading-relaxed text-[#A7AAB0]">{s.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ── FAQ ──────────────────────────────────────────────────────────────

export function FaqSection({ faqs }: { faqs: Array<{ id: string; question: string; answer: string }> }) {
  if (faqs.length === 0) return null;
  return (
    <section className="border-t border-ivory-line bg-white">
      <div className="mx-auto flex max-w-content flex-col gap-14 px-6 py-24 md:py-28 lg:flex-row">
        <div className="flex flex-col gap-4 lg:w-1/3">
          <SectionHeading
            eyebrow="FAQ"
            title="Questions, answered"
            description="Can’t find what you need? Our team is a message away."
          />
        </div>
        <div className="flex-1 border-t border-obsidian">
          {faqs.map((f) => (
            <details key={f.id} className="group border-b border-ivory-line py-6">
              <summary className="flex min-h-[44px] cursor-pointer items-center justify-between gap-5 text-lg font-semibold">
                {f.question}
                <Plus
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-deepgold transition-transform duration-300 group-open:rotate-45"
                  strokeWidth={1.4}
                />
              </summary>
              <p className="mt-3.5 max-w-2xl text-[15px] leading-[1.75] text-[#4A4D55]">{f.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Contact CTA ──────────────────────────────────────────────────────

export function ContactCta({
  whatsappHref,
  phoneHref,
  phone,
  email,
}: {
  whatsappHref: string | null;
  phoneHref: string | null;
  phone: string | null;
  email: string | null;
}) {
  return (
    <section id="contact" className="scroll-mt-24 bg-graphite text-white">
      <div className="mx-auto flex max-w-content flex-col items-center gap-6 px-6 py-24 text-center md:py-28">
        <span className="eyebrow text-champagne">Speak with our team</span>
        <h2 className="heading-display max-w-3xl text-[clamp(2.25rem,4.6vw,3.75rem)] leading-[1.08]">
          Your next vehicle is one conversation away.
        </h2>
        <p className="max-w-xl text-[17px] leading-relaxed text-[#C9CBD0]">
          Message us on WhatsApp, call the showroom, or send an email. A member of our sales team will respond personally.
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-3.5">
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[56px] items-center gap-2.5 rounded bg-champagne px-7 text-[13px] font-bold uppercase tracking-button text-obsidian transition-colors hover:bg-champagne-hover"
            >
              Chat on WhatsApp
            </a>
          ) : null}
          {phoneHref && phone ? (
            <a
              href={phoneHref}
              className="inline-flex min-h-[56px] items-center rounded border border-[#5B616B] px-7 text-[13px] font-semibold uppercase tracking-button transition-colors hover:border-champagne hover:text-champagne"
            >
              Call {phone}
            </a>
          ) : null}
          {email ? (
            <a
              href={`mailto:${email}`}
              className="inline-flex min-h-[56px] items-center rounded border border-[#5B616B] px-7 text-[13px] font-semibold uppercase tracking-button transition-colors hover:border-champagne hover:text-champagne"
            >
              Email us
            </a>
          ) : null}
          <Link
            href="/contact"
            className="inline-flex min-h-[56px] items-center rounded border border-[#5B616B] px-7 text-[13px] font-semibold uppercase tracking-button transition-colors hover:border-champagne hover:text-champagne"
          >
            Send a message
          </Link>
        </div>
      </div>
    </section>
  );
}
