import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/admin/ui";
import { requirePage } from "@/lib/auth/guards";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { CategoryEditor, FaqEditor, TeamEditor, TestimonialEditor } from "../list-editors";

const KINDS = {
  testimonials: { title: "Testimonials", description: "Shown on the homepage when at least one is published." },
  faqs: { title: "FAQs", description: "Shown on the homepage and used by the AI assistant." },
  team: { title: "Team", description: "Shown on the About page when at least one member is published." },
  categories: { title: "Vehicle categories", description: "Used for homepage category tiles and inventory filtering." },
} as const;

export function generateMetadata({ params }: { params: { kind: string } }) {
  return { title: KINDS[params.kind as keyof typeof KINDS]?.title ?? "Content" };
}

export default async function ContentListPage({ params }: { params: { kind: string } }) {
  await requirePage("content:write");
  const kind = params.kind as keyof typeof KINDS;
  const meta = KINDS[kind];
  if (!meta) notFound();
  const uploads = isCloudinaryConfigured();

  let items: React.ReactNode[] = [];
  let create: React.ReactNode = null;

  if (kind === "testimonials") {
    const rows = await prisma.testimonial.findMany({ orderBy: [{ position: "asc" }, { createdAt: "desc" }] });
    items = rows.map((r) => <TestimonialEditor key={r.id} item={r} />);
    create = <TestimonialEditor />;
  } else if (kind === "faqs") {
    const rows = await prisma.fAQ.findMany({ orderBy: { position: "asc" } });
    items = rows.map((r) => <FaqEditor key={r.id} item={r} />);
    create = <FaqEditor />;
  } else if (kind === "team") {
    const rows = await prisma.teamMember.findMany({ orderBy: { position: "asc" } });
    items = rows.map((r) => <TeamEditor key={r.id} item={r} uploadsEnabled={uploads} />);
    create = <TeamEditor uploadsEnabled={uploads} />;
  } else {
    const rows = await prisma.vehicleCategory.findMany({ orderBy: { position: "asc" }, include: { _count: { select: { vehicles: true } } } });
    items = rows.map((r) => <CategoryEditor key={r.id} item={{ ...r, count: r._count.vehicles }} />);
    create = <CategoryEditor />;
  }

  return (
    <>
      <PageHeader title={meta.title} description={meta.description} back={{ href: "/admin/content", label: "Content" }} />
      <div className="flex flex-col gap-5">
        <Card title="Add new">{create}</Card>
        {items.map((node, i) => (
          <Card key={i}>{node}</Card>
        ))}
      </div>
    </>
  );
}
