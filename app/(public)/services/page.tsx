import type { Metadata } from "next";
import { EnquiryForm } from "@/components/forms/enquiry-form";
import { PageHero } from "@/components/shared/page-hero";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Our Services",
  description: "Vehicle sales, luxury vehicles, sourcing, trade-in, financing assistance, inspection and after-sales support.",
  alternates: { canonical: "/services" },
};

interface Service {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  cta: { label: string; href: string };
}

const services: Service[] = [
  {
    id: "sales",
    eyebrow: "New & pre-owned",
    title: "New and used vehicle sales",
    body: "A carefully selected collection of new and pre-owned vehicles, each presented with full specifications and condition notes.",
    points: ["Transparent, clearly stated pricing", "Detailed specifications and photography", "Viewings and test drives by appointment"],
    cta: { label: "Browse inventory", href: "/inventory" },
  },
  {
    id: "luxury",
    eyebrow: "Luxury",
    title: "Luxury vehicle sales",
    body: "Prestige marques and high-specification models, with the discretion and attention a significant purchase deserves.",
    points: ["Private viewings", "Detailed history and provenance", "Personal handover"],
    cta: { label: "View luxury vehicles", href: "/inventory?category=luxury" },
  },
  {
    id: "sourcing",
    eyebrow: "Sourcing",
    title: "Vehicle sourcing",
    body: "Can't see the exact vehicle you want? Tell us the make, model, specification and budget, and we'll search on your behalf.",
    points: ["Specification-matched search", "Pre-purchase checks", "Clear updates throughout"],
    cta: { label: "Request sourcing", href: "#sourcing-form" },
  },
  {
    id: "trade-in",
    eyebrow: "Trade-in",
    title: "Trade-in and vehicle exchange",
    body: "Put the value of your current vehicle towards your next one. Share its details and photos and we'll respond with a valuation.",
    points: ["Simple online submission", "Valuation from our team", "Exchange in one transaction"],
    cta: { label: "Value my vehicle", href: "/trade-in" },
  },
  {
    id: "financing",
    eyebrow: "Financing",
    title: "Financing assistance",
    body: "We help you explore financing options with our lending partners and prepare your enquiry. Approval and terms are decided by the lender.",
    points: ["Guidance on deposit and term", "Enquiry passed to partner lenders", "No obligation"],
    cta: { label: "Start a financing enquiry", href: "/financing" },
  },
  {
    id: "inspection",
    eyebrow: "Inspection",
    title: "Vehicle inspection and verification",
    body: "Book an inspection of any vehicle in our inventory, or ask us to check documents and condition before you commit.",
    points: ["Condition checks", "Document verification", "Clear written notes"],
    cta: { label: "Book an inspection", href: "#inspection-form" },
  },
  {
    id: "after-sales",
    eyebrow: "After-sales",
    title: "After-sales support",
    body: "Our relationship continues after handover — for questions, servicing advice, paperwork and your next vehicle.",
    points: ["A named point of contact", "Help with paperwork", "Priority on future purchases"],
    cta: { label: "Contact our team", href: "/contact" },
  },
];

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="Our services"
        title="Everything around the car, handled"
        description="From finding the right vehicle to financing, trade-in and support after you drive away."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Services" }]}
      >
        <nav aria-label="Services" className="mt-2 flex flex-wrap gap-2">
          {services.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="inline-flex min-h-[40px] items-center border border-graphite-muted px-4 text-[13px] font-semibold hover:border-champagne hover:text-champagne">
              {s.eyebrow}
            </a>
          ))}
        </nav>
      </PageHero>

      <div className="bg-ivory">
        <div className="mx-auto flex max-w-content flex-col px-6 py-10">
          {services.map((s, i) => (
            <section key={s.id} id={s.id} className="grid scroll-mt-28 gap-10 border-b border-ivory-line py-16 last:border-0 lg:grid-cols-[1fr_1.3fr]">
              <div className="flex flex-col gap-4">
                <span className="eyebrow text-deepgold">
                  {String(i + 1).padStart(2, "0")} · {s.eyebrow}
                </span>
                <h2 className="heading-display text-[clamp(1.9rem,3.4vw,2.7rem)]">{s.title}</h2>
              </div>
              <div className="flex flex-col gap-6">
                <p className="text-[17px] leading-relaxed text-ink-body">{s.body}</p>
                <ul className="grid gap-3 sm:grid-cols-3">
                  {s.points.map((p) => (
                    <li key={p} className="border-t border-obsidian pt-3 text-sm font-semibold">
                      {p}
                    </li>
                  ))}
                </ul>
                <ButtonLink href={s.cta.href} variant="dark" className="self-start">
                  {s.cta.label}
                </ButtonLink>
              </div>
            </section>
          ))}
        </div>
      </div>

      <section className="bg-white">
        <div className="mx-auto grid max-w-content gap-14 px-6 py-24 lg:grid-cols-2">
          <div id="sourcing-form" className="flex scroll-mt-28 flex-col gap-6">
            <h2 className="heading-display text-[32px]">Request vehicle sourcing</h2>
            <p className="text-[15px] leading-relaxed text-ink-body">Tell us what you're looking for and we'll start the search.</p>
            <EnquiryForm defaultType="SOURCING" source="services_sourcing" submitLabel="Request sourcing" defaultMessage="" />
          </div>
          <div id="inspection-form" className="flex scroll-mt-28 flex-col gap-6">
            <h2 className="heading-display text-[32px]">Book an inspection or callback</h2>
            <p className="text-[15px] leading-relaxed text-ink-body">Ask about a vehicle's condition or have a specialist call you back.</p>
            <EnquiryForm defaultType="INSPECTION" types={["INSPECTION", "CALLBACK", "GENERAL"]} source="services_inspection" defaultMessage="" />
          </div>
        </div>
      </section>
    </>
  );
}
