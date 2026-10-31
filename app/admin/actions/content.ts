"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { fail, fromZodError, unexpected, type ActionResult } from "@/lib/actions";
import { logActivity } from "@/lib/activity";
import { AuthError, requireAction } from "@/lib/auth/guards";
import type { Permission } from "@/lib/auth/permissions";
import { verifyAsset } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { revalidateSite } from "@/lib/revalidate";
import { slugify } from "@/lib/utils";

function handle(scope: string, error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail(error.message);
  return unexpected(scope, error);
}

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const text = (max: number) => z.preprocess(blank, z.string().trim().max(max).optional());
const url = z.preprocess(blank, z.string().trim().url("Enter a full https:// link.").refine((u) => u.startsWith("https://") || u.startsWith("/"), "Use https://").optional());
const int = z.preprocess(blank, z.coerce.number().int().min(0).max(10_000_000).optional());
const bool = z.preprocess((v) => v === "on" || v === "true", z.boolean());
// Turns missing optional values into null (clears the column); required fields keep their type.
const nullify = <T extends Record<string, unknown>>(o: T) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v === undefined ? null : v])) as { [K in keyof T]-?: undefined extends T[K] ? Exclude<T[K], undefined> | null : T[K] };

/** Image inputs post JSON {publicId?, url?}. New uploads are verified; unchanged URLs are kept. */
async function resolveImage(raw: FormDataEntryValue | null, current: string | null): Promise<string | null | "invalid"> {
  if (typeof raw !== "string" || raw === "") return null;
  try {
    const parsed = JSON.parse(raw) as { publicId?: string; url?: string } | null;
    if (!parsed || (!parsed.publicId && !parsed.url)) return null;
    if (parsed.publicId) {
      const asset = await verifyAsset(parsed.publicId, "content");
      return asset ? asset.url : "invalid";
    }
    return parsed.url === current ? current : "invalid";
  } catch {
    return "invalid";
  }
}

const sections = {
  homepage: {
    permission: "content:write" as Permission,
    schema: z.object({
      announcementText: text(160),
      announcementLinkText: text(40),
      announcementLinkUrl: text(300),
      heroEyebrow: z.string().trim().min(1).max(80),
      heroHeading: z.string().trim().min(3, "Add a heading.").max(120),
      heroSubheading: z.string().trim().min(3).max(400),
      heroImageAlt: text(200),
      promoEyebrow: text(60),
      promoHeading: text(120),
      promoBody: text(400),
      promoCtaText: text(40),
      promoCtaUrl: text(300),
      statVehiclesSold: int,
      statCustomers: int,
      statYearsExperience: int,
      statLiveAvailability: bool,
    }),
    images: ["heroImageUrl", "promoImageUrl"] as const,
  },
  about: {
    permission: "content:write" as Permission,
    schema: z.object({
      aboutHeading: text(120),
      aboutStory: text(8000),
      mission: z.string().trim().min(10).max(1000),
      vision: z.string().trim().min(10).max(1000),
    }),
    images: ["aboutImageUrl"] as const,
  },
  contact: {
    permission: "settings:write" as Permission,
    schema: z.object({
      businessName: z.string().trim().min(2).max(80),
      tagline: z.string().trim().min(2).max(120),
      phone: text(30),
      whatsappNumber: z.preprocess(blank, z.string().trim().regex(/^\d{7,15}$/, "Digits only, with country code, e.g. 2348012345678.").optional()),
      email: z.preprocess(blank, z.string().trim().email().optional()),
      addressLine: text(200),
      city: text(80),
      country: text(80),
      mapEmbedUrl: z.preprocess(
        blank,
        z.string().trim().url().refine((u) => /^https:\/\/(www\.)?google\.com\/maps\/embed/.test(u), "Paste the Google Maps “Embed a map” src URL.").optional(),
      ),
      openingHours: text(1000),
    }),
    images: [] as const,
  },
  social: {
    permission: "settings:write" as Permission,
    schema: z.object({ instagramUrl: url, facebookUrl: url, xUrl: url, youtubeUrl: url, tiktokUrl: url, linkedinUrl: url }),
    images: [] as const,
  },
  footer: {
    permission: "settings:write" as Permission,
    schema: z.object({ footerText: text(300), businessRegistration: text(200) }),
    images: [] as const,
  },
  seo: {
    permission: "settings:write" as Permission,
    schema: z.object({ seoTitle: text(70), seoDescription: text(170) }),
    images: ["ogImageUrl"] as const,
  },
  payments: {
    permission: "settings:write" as Permission,
    schema: z.object({
      reservationDepositEnabled: bool,
      reservationDepositAmount: z.coerce.number({ invalid_type_error: "Enter an amount in naira." }).min(100, "Minimum ₦100.").max(100_000_000),
      reservationHoldDays: z.coerce.number().int().min(1).max(60),
    }),
    images: [] as const,
  },
  regional: {
    permission: "settings:write" as Permission,
    schema: z.object({
      currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/),
      locale: z.string().trim().regex(/^[a-z]{2}(-[A-Z]{2})?$/, "e.g. en-US, en-GB, en-NG"),
      mileageUnit: z.enum(["km", "mi"]),
      timezone: z.string().trim().refine((tz) => {
        try {
          new Intl.DateTimeFormat("en-US", { timeZone: tz });
          return true;
        } catch {
          return false;
        }
      }, "Unknown time zone, e.g. Africa/Lagos"),
      altCurrencies: text(500),
      altCurrenciesNote: text(160),
      assistantEnabled: bool,
    }),
    images: [] as const,
  },
};

export type SettingsSection = keyof typeof sections;

function parseOpeningHours(value: string | undefined): Prisma.InputJsonValue | undefined {
  if (!value) return undefined;
  return value
    .split("\n")
    .map((l) => l.split("|").map((s) => s.trim()))
    .filter(([d, h]) => d && h)
    .map(([days, hours]) => ({ days: days!, hours: hours! }));
}

function parseAltCurrencies(value: string | undefined): Prisma.InputJsonValue | undefined | "invalid" {
  if (!value) return undefined;
  const rows = value.split(/[\n,]/).map((l) => l.trim()).filter(Boolean);
  const out: Array<{ code: string; rate: number }> = [];
  for (const row of rows) {
    const m = row.match(/^([A-Za-z]{3})\s*=\s*([\d.]+)$/);
    if (!m) return "invalid";
    out.push({ code: m[1]!.toUpperCase(), rate: Number(m[2]) });
  }
  return out;
}

export async function updateSettings(section: SettingsSection, formData: FormData): Promise<ActionResult> {
  const def = sections[section];
  if (!def) return fail("Unknown section.");
  try {
    const user = await requireAction(def.permission);
    const schema = def.schema as z.ZodObject<z.ZodRawShape>;
    const raw = Object.fromEntries(Object.keys(schema.shape).map((k) => [k, formData.get(k) ?? undefined]));
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return fromZodError(parsed.error);
    const current = await prisma.siteSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });

    const values = parsed.data as Record<string, unknown>;
    const data: Record<string, unknown> = nullify(values);
    if (section === "contact") data.openingHours = parseOpeningHours(values.openingHours as string | undefined) ?? null;
    if (section === "regional") {
      const alts = parseAltCurrencies(values.altCurrencies as string | undefined);
      if (alts === "invalid") return { ok: false, message: "Use one rate per line, like USD=0.00065.", fieldErrors: { altCurrencies: ["Format: CODE=rate"] } };
      data.altCurrencies = alts ?? null;
    }
    for (const field of def.images as readonly ("heroImageUrl" | "promoImageUrl" | "aboutImageUrl" | "ogImageUrl")[]) {
      const resolved = await resolveImage(formData.get(field), current[field]);
      if (resolved === "invalid") return { ok: false, message: "An image couldn't be verified. Please upload it again.", fieldErrors: { [field]: ["Upload again."] } };
      data[field] = resolved;
    }

    // Json columns need Prisma.JsonNull rather than plain null.
    if (section === "payments") data.reservationDepositAmount = new Prisma.Decimal(Number(values.reservationDepositAmount));
    for (const jsonField of ["openingHours", "altCurrencies"]) {
      if (jsonField in data && data[jsonField] === null) data[jsonField] = Prisma.JsonNull;
    }

    await prisma.siteSettings.update({ where: { id: "default" }, data: data as Prisma.SiteSettingsUpdateInput });
    await logActivity({ actorId: user.id, action: "settings.updated", entityType: "SiteSettings", entityId: "default", summary: `updated ${section} settings` });
    revalidateSite();
    return { ok: true, message: "Saved. The website has been updated." };
  } catch (error) {
    return handle("updateSettings", error);
  }
}

// ── Testimonials ───────────────────────────────────────────────────

const testimonialSchema = z.object({
  customerName: z.string().trim().min(2).max(80),
  location: text(80),
  vehicleLabel: text(120),
  quote: z.string().trim().min(10).max(1500),
  rating: z.preprocess(blank, z.coerce.number().int().min(1).max(5).optional()),
  position: z.preprocess(blank, z.coerce.number().int().min(0).max(999).default(0)),
  isPublished: bool,
});

export async function saveTestimonial(id: string | null, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireAction("content:write");
    const parsed = testimonialSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const data = nullify(parsed.data);
    const row = id
      ? await prisma.testimonial.update({ where: { id }, data: { ...data, position: parsed.data.position } })
      : await prisma.testimonial.create({ data: { ...data, position: parsed.data.position } });
    await logActivity({ actorId: user.id, action: id ? "testimonial.updated" : "testimonial.created", entityType: "Testimonial", entityId: row.id, summary: `${id ? "updated" : "added"} a testimonial from ${row.customerName}` });
    revalidatePath("/");
    revalidatePath("/admin/content/testimonials");
    return { ok: true, message: id ? "Saved." : "Testimonial added." };
  } catch (error) {
    return handle("saveTestimonial", error);
  }
}

export async function deleteTestimonial(id: string): Promise<ActionResult> {
  try {
    const user = await requireAction("content:write");
    await prisma.testimonial.delete({ where: { id } });
    await logActivity({ actorId: user.id, action: "testimonial.deleted", entityType: "Testimonial", entityId: id, summary: "deleted a testimonial" });
    revalidatePath("/");
    revalidatePath("/admin/content/testimonials");
    return { ok: true, message: "Deleted." };
  } catch (error) {
    return handle("deleteTestimonial", error);
  }
}

// ── FAQs ───────────────────────────────────────────────────────────

const faqSchema = z.object({
  question: z.string().trim().min(5).max(200),
  answer: z.string().trim().min(5).max(3000),
  category: text(60),
  position: z.preprocess(blank, z.coerce.number().int().min(0).max(999).default(0)),
  isPublished: bool,
});

export async function saveFaq(id: string | null, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireAction("content:write");
    const parsed = faqSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const data = { ...parsed.data, category: parsed.data.category ?? null };
    const row = id ? await prisma.fAQ.update({ where: { id }, data }) : await prisma.fAQ.create({ data });
    await logActivity({ actorId: user.id, action: id ? "faq.updated" : "faq.created", entityType: "FAQ", entityId: row.id, summary: `${id ? "updated" : "added"} an FAQ` });
    revalidatePath("/");
    revalidatePath("/admin/content/faqs");
    return { ok: true, message: id ? "Saved." : "FAQ added." };
  } catch (error) {
    return handle("saveFaq", error);
  }
}

export async function deleteFaq(id: string): Promise<ActionResult> {
  try {
    const user = await requireAction("content:write");
    await prisma.fAQ.delete({ where: { id } });
    await logActivity({ actorId: user.id, action: "faq.deleted", entityType: "FAQ", entityId: id, summary: "deleted an FAQ" });
    revalidatePath("/");
    revalidatePath("/admin/content/faqs");
    return { ok: true, message: "Deleted." };
  } catch (error) {
    return handle("deleteFaq", error);
  }
}

// ── Team ───────────────────────────────────────────────────────────

const teamSchema = z.object({
  name: z.string().trim().min(2).max(80),
  role: z.string().trim().min(2).max(80),
  bio: text(800),
  position: z.preprocess(blank, z.coerce.number().int().min(0).max(999).default(0)),
  isPublished: bool,
});

export async function saveTeamMember(id: string | null, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireAction("content:write");
    const parsed = teamSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const current = id ? await prisma.teamMember.findUnique({ where: { id }, select: { photoUrl: true } }) : null;
    const photo = await resolveImage(formData.get("photoUrl"), current?.photoUrl ?? null);
    if (photo === "invalid") return { ok: false, message: "The photo couldn't be verified. Please upload it again.", fieldErrors: { photoUrl: ["Upload again."] } };
    const data = { ...parsed.data, bio: parsed.data.bio ?? null, photoUrl: photo };
    const row = id ? await prisma.teamMember.update({ where: { id }, data }) : await prisma.teamMember.create({ data });
    await logActivity({ actorId: user.id, action: id ? "team.updated" : "team.created", entityType: "TeamMember", entityId: row.id, summary: `${id ? "updated" : "added"} team member ${row.name}` });
    revalidatePath("/about");
    revalidatePath("/admin/content/team");
    return { ok: true, message: id ? "Saved." : "Team member added." };
  } catch (error) {
    return handle("saveTeamMember", error);
  }
}

export async function deleteTeamMember(id: string): Promise<ActionResult> {
  try {
    const user = await requireAction("content:write");
    await prisma.teamMember.delete({ where: { id } });
    await logActivity({ actorId: user.id, action: "team.deleted", entityType: "TeamMember", entityId: id, summary: "removed a team member" });
    revalidatePath("/about");
    revalidatePath("/admin/content/team");
    return { ok: true, message: "Removed." };
  } catch (error) {
    return handle("deleteTeamMember", error);
  }
}

// ── Categories ─────────────────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z.preprocess(blank, z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,60}$/, "Lowercase letters, numbers and dashes.").optional()),
  description: text(200),
  position: z.preprocess(blank, z.coerce.number().int().min(0).max(999).default(0)),
  isVisible: bool,
});

export async function saveCategory(id: string | null, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireAction("content:write");
    const parsed = categorySchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return fromZodError(parsed.error);
    const slug = parsed.data.slug ?? slugify(parsed.data.name);
    const clash = await prisma.vehicleCategory.findFirst({
      where: { OR: [{ slug }, { name: parsed.data.name }], ...(id ? { id: { not: id } } : {}) },
      select: { id: true },
    });
    if (clash) return { ok: false, message: "A category with that name or slug already exists.", fieldErrors: { slug: ["Already used."] } };
    const data = { ...parsed.data, slug, description: parsed.data.description ?? null };
    const row = id ? await prisma.vehicleCategory.update({ where: { id }, data }) : await prisma.vehicleCategory.create({ data });
    await logActivity({ actorId: user.id, action: id ? "category.updated" : "category.created", entityType: "VehicleCategory", entityId: row.id, summary: `${id ? "updated" : "added"} category ${row.name}` });
    revalidatePath("/");
    revalidatePath("/inventory");
    revalidatePath("/admin/content/categories");
    return { ok: true, message: id ? "Saved." : "Category added." };
  } catch (error) {
    return handle("saveCategory", error);
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  try {
    const user = await requireAction("content:write");
    await prisma.vehicleCategory.delete({ where: { id } }); // implicit M2M links are removed; vehicles stay
    await logActivity({ actorId: user.id, action: "category.deleted", entityType: "VehicleCategory", entityId: id, summary: "deleted a category" });
    revalidatePath("/");
    revalidatePath("/admin/content/categories");
    return { ok: true, message: "Category deleted (vehicles were kept)." };
  } catch (error) {
    return handle("deleteCategory", error);
  }
}
