"use server";

import { Prisma, VehicleStatus } from "@prisma/client";
import { fail, fromZodError, unexpected, type ActionResult } from "@/lib/actions";
import { logActivity } from "@/lib/activity";
import { AuthError, requireAction } from "@/lib/auth/guards";
import { createUploadSignature, deleteAsset, verifyAsset, type UploadSignature } from "@/lib/cloudinary";
import { csvToObjects } from "@/lib/csv";
import { prisma } from "@/lib/prisma";
import { revalidateInventory } from "@/lib/revalidate";
import { slugify } from "@/lib/utils";
import { vehicleTitle } from "@/lib/vehicles/format";
import { FEATURE_GROUP_VALUES, vehicleCoreSchema, vehicleSchema, type VehicleFormValues } from "@/lib/validations/vehicle";

function authFail(error: unknown, scope: string): ActionResult<never> {
  if (error instanceof AuthError) return fail(error.message);
  return unexpected(scope, error);
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base).slice(0, 110) || "vehicle";
  let candidate = root;
  for (let n = 2; n < 200; n += 1) {
    const clash = await prisma.vehicle.findFirst({ where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } });
    if (!clash) return candidate;
    candidate = `${root}-${n}`;
  }
  return `${root}-${Date.now()}`;
}

function scalarData(v: VehicleFormValues) {
  return {
    stockNumber: v.stockNumber,
    make: v.make,
    model: v.model,
    trim: v.trim ?? null,
    year: v.year,
    bodyType: v.bodyType,
    condition: v.condition,
    status: v.status,
    price: new Prisma.Decimal(v.price),
    currency: v.currency,
    priceOnRequest: v.priceOnRequest,
    mileage: v.mileage,
    transmission: v.transmission,
    fuelType: v.fuelType,
    drivetrain: v.drivetrain ?? null,
    engineCapacityCc: v.engineCapacityCc ?? null,
    horsepower: v.horsepower ?? null,
    doors: v.doors ?? null,
    seats: v.seats ?? null,
    exteriorColour: v.exteriorColour,
    interiorColour: v.interiorColour ?? null,
    vin: v.vin ?? null,
    showVin: v.showVin,
    description: v.description ?? null,
    inspectionNotes: v.inspectionNotes ?? null,
    inspectedAt: v.inspectedAt ? new Date(`${v.inspectedAt}T00:00:00.000Z`) : null,
    serviceHistory: v.serviceHistory ?? null,
    previousOwners: v.previousOwners ?? null,
    videoUrl: v.videoUrl ?? null,
    isFeatured: v.isFeatured,
    isPublished: v.isPublished,
    metaTitle: v.metaTitle ?? null,
    metaDescription: v.metaDescription ?? null,
  };
}

// ── Uploads ─────────────────────────────────────────────────────────

export async function getVehicleUploadSignature(scope: "vehicles" | "content" = "vehicles"): Promise<ActionResult<UploadSignature>> {
  try {
    await requireAction(scope === "vehicles" ? "vehicles:write" : "content:write");
    const sig = createUploadSignature(scope);
    return sig ? { ok: true, data: sig } : fail("Cloudinary isn't configured. Add the CLOUDINARY_* variables to enable uploads.");
  } catch (error) {
    return authFail(error, "getVehicleUploadSignature");
  }
}

// ── Create / update ─────────────────────────────────────────────────

export async function saveVehicle(raw: unknown, id?: string): Promise<ActionResult<{ id: string; slug: string }>> {
  let actorId: string;
  try {
    actorId = (await requireAction("vehicles:write")).id;
  } catch (error) {
    return authFail(error, "saveVehicle");
  }
  const parsed = vehicleSchema.safeParse(raw);
  if (!parsed.success) return fromZodError(parsed.error);
  const v = parsed.data;

  try {
    const existing = id
      ? await prisma.vehicle.findUnique({ where: { id }, include: { images: true } })
      : null;
    if (id && !existing) return fail("This vehicle no longer exists.");

    // Uniqueness checks with friendly messages.
    const [stockClash, vinClash] = await Promise.all([
      prisma.vehicle.findFirst({ where: { stockNumber: v.stockNumber, ...(id ? { id: { not: id } } : {}) }, select: { id: true } }),
      v.vin ? prisma.vehicle.findFirst({ where: { vin: v.vin, ...(id ? { id: { not: id } } : {}) }, select: { id: true } }) : null,
    ]);
    if (stockClash) return { ok: false, message: "That stock number is already in use.", fieldErrors: { stockNumber: ["Already in use."] } };
    if (vinClash) return { ok: false, message: "That VIN is already on another vehicle.", fieldErrors: { vin: ["Already in use."] } };

    // Images: existing ones must belong to this vehicle; new ones are verified with Cloudinary.
    const existingIds = new Set(existing?.images.map((i) => i.id) ?? []);
    const imageRows: Array<{ id?: string; url: string; publicId: string | null; alt: string | null; width: number | null; height: number | null }> = [];
    for (const img of v.images) {
      if (img.id) {
        if (!existingIds.has(img.id)) return fail("An image doesn't belong to this vehicle. Please reload and try again.");
        const current = existing!.images.find((i) => i.id === img.id)!;
        imageRows.push({ id: img.id, url: current.url, publicId: current.publicId, alt: img.alt ?? null, width: current.width, height: current.height });
      } else {
        if (!img.publicId) return fail("A new photo is missing its upload reference.");
        const asset = await verifyAsset(img.publicId, "vehicles");
        if (!asset) return fail("A photo couldn't be verified (wrong type, too large or not uploaded). Please remove it and upload again.");
        imageRows.push({ url: asset.url, publicId: asset.publicId, alt: img.alt ?? null, width: asset.width, height: asset.height });
      }
    }
    const keptIds = new Set(imageRows.map((r) => r.id).filter(Boolean));
    const removed = existing?.images.filter((i) => !keptIds.has(i.id)) ?? [];

    const categoryIds = v.categoryIds.length
      ? (await prisma.vehicleCategory.findMany({ where: { id: { in: v.categoryIds } }, select: { id: true } })).map((c) => c.id)
      : [];

    const titleBase = `${v.year} ${v.make} ${v.model} ${v.trim ?? ""} ${v.stockNumber}`;
    const slug = v.slug ? await uniqueSlug(v.slug, id) : existing ? existing.slug : await uniqueSlug(titleBase);

    const data = scalarData(v);
    const nowPublished = v.isPublished && !existing?.isPublished;
    const statusDates = {
      publishedAt: nowPublished ? new Date() : existing?.publishedAt ?? (v.isPublished ? new Date() : null),
      soldAt: v.status === VehicleStatus.SOLD ? (existing?.soldAt ?? new Date()) : null,
    };

    const saved = await prisma.$transaction(async (tx) => {
      const vehicle = existing
        ? await tx.vehicle.update({
            where: { id: existing.id },
            data: { ...data, ...statusDates, slug, categories: { set: categoryIds.map((cid) => ({ id: cid })) } },
          })
        : await tx.vehicle.create({
            data: { ...data, ...statusDates, slug, createdById: actorId, categories: { connect: categoryIds.map((cid) => ({ id: cid })) } },
          });

      await tx.vehicleFeature.deleteMany({ where: { vehicleId: vehicle.id } });
      const seen = new Set<string>();
      const features = v.features
        .filter((f) => {
          const key = `${f.group}:${f.label.toLowerCase()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((f, i) => ({ vehicleId: vehicle.id, group: f.group, label: f.label, position: i }));
      if (features.length) await tx.vehicleFeature.createMany({ data: features });

      if (removed.length) await tx.vehicleImage.deleteMany({ where: { id: { in: removed.map((r) => r.id) } } });
      for (const [position, img] of imageRows.entries()) {
        if (img.id) await tx.vehicleImage.update({ where: { id: img.id }, data: { position, alt: img.alt } });
        else
          await tx.vehicleImage.create({
            data: { vehicleId: vehicle.id, url: img.url, publicId: img.publicId, alt: img.alt, width: img.width, height: img.height, position },
          });
      }

      await logActivity(
        {
          actorId,
          action: existing ? "vehicle.updated" : "vehicle.created",
          entityType: "Vehicle",
          entityId: vehicle.id,
          summary: `${existing ? "updated" : "added"} ${vehicleTitle(vehicle)}`,
        },
        tx,
      );
      return vehicle;
    });

    for (const r of removed) if (r.publicId) await deleteAsset(r.publicId);
    revalidateInventory(saved.slug, existing?.slug !== saved.slug ? existing?.slug : null);
    return { ok: true, message: existing ? "Vehicle updated." : "Vehicle created.", data: { id: saved.id, slug: saved.slug } };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("A vehicle with the same stock number, VIN or URL already exists.");
    }
    return unexpected("saveVehicle", error);
  }
}

// ── Quick actions from the list ─────────────────────────────────────

async function quickUpdate(id: string, data: Prisma.VehicleUpdateInput, summary: (title: string) => string, action: string): Promise<ActionResult> {
  try {
    const actor = await requireAction("vehicles:write");
    const vehicle = await prisma.vehicle.update({ where: { id }, data });
    await logActivity({ actorId: actor.id, action, entityType: "Vehicle", entityId: id, summary: summary(vehicleTitle(vehicle)) });
    revalidateInventory(vehicle.slug);
    return { ok: true, message: "Updated." };
  } catch (error) {
    return authFail(error, action);
  }
}

export async function setVehicleStatus(id: string, status: VehicleStatus): Promise<ActionResult> {
  if (!Object.values(VehicleStatus).includes(status)) return fail("Unknown status.");
  return quickUpdate(
    id,
    { status, soldAt: status === VehicleStatus.SOLD ? new Date() : null, ...(status !== VehicleStatus.RESERVED ? { reservedUntil: null } : {}) },
    (t) => `marked ${t} as ${status.toLowerCase()}`,
    "vehicle.status_changed",
  );
}

export async function setVehicleFeatured(id: string, isFeatured: boolean): Promise<ActionResult> {
  return quickUpdate(id, { isFeatured }, (t) => `${isFeatured ? "featured" : "unfeatured"} ${t}`, "vehicle.featured_changed");
}

export async function setVehiclePublished(id: string, isPublished: boolean): Promise<ActionResult> {
  return quickUpdate(
    id,
    { isPublished, ...(isPublished ? { publishedAt: new Date() } : {}) },
    (t) => `${isPublished ? "published" : "unpublished"} ${t}`,
    "vehicle.published_changed",
  );
}

/** Hard delete only when nothing references the vehicle; otherwise archive. */
export async function deleteVehicle(id: string): Promise<ActionResult> {
  try {
    const actor = await requireAction("vehicles:delete");
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: { images: true, _count: { select: { enquiries: true, testDrives: true, financing: true, tradeInsTowards: true } } },
    });
    if (!vehicle) return fail("Vehicle not found.");
    const refs = vehicle._count.enquiries + vehicle._count.testDrives + vehicle._count.financing + vehicle._count.tradeInsTowards;
    if (refs > 0) {
      await prisma.vehicle.update({ where: { id }, data: { status: VehicleStatus.ARCHIVED, isPublished: false } });
      await logActivity({ actorId: actor.id, action: "vehicle.archived", entityType: "Vehicle", entityId: id, summary: `archived ${vehicleTitle(vehicle)}` });
      revalidateInventory(vehicle.slug);
      return { ok: true, message: "This vehicle has enquiry history, so it was archived instead of deleted." };
    }
    await prisma.vehicle.delete({ where: { id } });
    for (const img of vehicle.images) if (img.publicId) await deleteAsset(img.publicId);
    await logActivity({ actorId: actor.id, action: "vehicle.deleted", entityType: "Vehicle", entityId: id, summary: `deleted ${vehicleTitle(vehicle)}` });
    revalidateInventory(vehicle.slug);
    return { ok: true, message: "Vehicle deleted." };
  } catch (error) {
    return authFail(error, "deleteVehicle");
  }
}

// ── CSV import ──────────────────────────────────────────────────────

export interface ImportRowResult {
  row: number;
  stockNumber: string;
  outcome: "create" | "update" | "skip" | "error";
  message?: string;
}

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const MAX_IMPORT_ROWS = 1000;

function splitList(value: string | undefined): string[] {
  return (value ?? "").split("|").map((s) => s.trim()).filter(Boolean);
}

/**
 * Columns: stockNumber, make, model, trim, year, bodyType, condition, status,
 * price, currency, mileage, transmission, fuelType, drivetrain,
 * engineCapacityCc, horsepower, doors, seats, exteriorColour, interiorColour,
 * vin, description, isFeatured, isPublished, categories (slug|slug),
 * features (GROUP:label|GROUP:label).
 */
export async function importVehiclesCsv(formData: FormData): Promise<ActionResult<{ results: ImportRowResult[]; committed: boolean }>> {
  let actorId: string;
  try {
    actorId = (await requireAction("vehicles:import")).id;
  } catch (error) {
    return authFail(error, "importVehiclesCsv");
  }
  const file = formData.get("file");
  const commit = formData.get("commit") === "true";
  const updateExisting = formData.get("updateExisting") === "on" || formData.get("updateExisting") === "true";
  if (!(file instanceof File) || file.size === 0) return fail("Choose a CSV file.");
  if (file.size > MAX_IMPORT_BYTES) return fail("CSV files must be under 2 MB.");
  if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") return fail("Please upload a .csv file.");

  const { headers, records } = csvToObjects(await file.text());
  for (const required of ["stockNumber", "make", "model", "year", "bodyType", "condition", "price", "mileage", "transmission", "fuelType", "exteriorColour"]) {
    if (!headers.includes(required)) return fail(`Missing required column: ${required}`);
  }
  if (records.length > MAX_IMPORT_ROWS) return fail(`Import up to ${MAX_IMPORT_ROWS} rows at a time.`);

  const categories = await prisma.vehicleCategory.findMany({ select: { id: true, slug: true } });
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));
  const stockNumbers = records.map((r) => r.stockNumber ?? "").filter(Boolean);
  const vins = records.map((r) => (r.vin ?? "").toUpperCase()).filter(Boolean);
  const [existingByStock, existingByVin] = await Promise.all([
    prisma.vehicle.findMany({ where: { stockNumber: { in: stockNumbers } }, select: { id: true, stockNumber: true, vin: true } }),
    vins.length ? prisma.vehicle.findMany({ where: { vin: { in: vins } }, select: { id: true, stockNumber: true, vin: true } }) : [],
  ]);
  const stockMap = new Map(existingByStock.map((v) => [v.stockNumber, v]));
  const vinMap = new Map(existingByVin.map((v) => [v.vin, v]));

  const seenStock = new Set<string>();
  const seenVin = new Set<string>();
  const results: ImportRowResult[] = [];
  const planned: Array<{ existingId?: string; data: ReturnType<typeof scalarData>; categoryIds: string[]; features: Array<{ group: (typeof FEATURE_GROUP_VALUES)[number]; label: string }> }> = [];

  records.forEach((r, i) => {
    const rowNo = i + 2; // header is row 1
    const stock = r.stockNumber ?? "";
    const parsed = vehicleCoreSchema.safeParse({
      ...r,
      status: r.status || "AVAILABLE",
      currency: r.currency || "NGN",
      bodyType: (r.bodyType ?? "").toUpperCase(),
      condition: (r.condition ?? "").toUpperCase(),
      transmission: (r.transmission ?? "").toUpperCase(),
      fuelType: (r.fuelType ?? "").toUpperCase(),
      drivetrain: (r.drivetrain ?? "").toUpperCase(),
      priceOnRequest: r.priceOnRequest ?? "false",
      showVin: r.showVin ?? "false",
      isFeatured: r.isFeatured ?? "false",
      isPublished: r.isPublished ?? "false",
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      results.push({ row: rowNo, stockNumber: stock, outcome: "error", message: issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid row" });
      return;
    }
    const v = parsed.data;
    if (seenStock.has(v.stockNumber)) {
      results.push({ row: rowNo, stockNumber: stock, outcome: "error", message: "Duplicate stock number within this file" });
      return;
    }
    if (v.vin && seenVin.has(v.vin)) {
      results.push({ row: rowNo, stockNumber: stock, outcome: "error", message: "Duplicate VIN within this file" });
      return;
    }
    seenStock.add(v.stockNumber);
    if (v.vin) seenVin.add(v.vin);

    const existing = stockMap.get(v.stockNumber);
    const vinOwner = v.vin ? vinMap.get(v.vin) : undefined;
    if (vinOwner && vinOwner.stockNumber !== v.stockNumber) {
      results.push({ row: rowNo, stockNumber: stock, outcome: "error", message: `VIN already used by ${vinOwner.stockNumber}` });
      return;
    }
    if (existing && !updateExisting) {
      results.push({ row: rowNo, stockNumber: stock, outcome: "skip", message: "Stock number already exists" });
      return;
    }
    const unknownCats = splitList(r.categories).filter((s) => !categoryBySlug.has(s));
    const features = splitList(r.features).flatMap((f) => {
      const [g, ...rest] = f.split(":");
      const group = (g ?? "").trim().toUpperCase();
      const label = rest.join(":").trim();
      return (FEATURE_GROUP_VALUES as readonly string[]).includes(group) && label
        ? [{ group: group as (typeof FEATURE_GROUP_VALUES)[number], label: label.slice(0, 120) }]
        : [];
    });
    planned.push({
      existingId: existing?.id,
      data: scalarData({ ...v, categoryIds: [], features: [], images: [] }),
      categoryIds: splitList(r.categories).flatMap((s) => (categoryBySlug.has(s) ? [categoryBySlug.get(s)!] : [])),
      features,
    });
    results.push({
      row: rowNo,
      stockNumber: stock,
      outcome: existing ? "update" : "create",
      message: unknownCats.length ? `Unknown categories ignored: ${unknownCats.join(", ")}` : undefined,
    });
  });

  if (!commit) return { ok: true, message: "Preview ready. Nothing has been saved yet.", data: { results, committed: false } };
  if (planned.length === 0) return fail("No valid rows to import.");

  try {
    let created = 0;
    let updated = 0;
    await prisma.$transaction(
      async (tx) => {
        for (const p of planned) {
          const title = `${p.data.year} ${p.data.make} ${p.data.model} ${p.data.trim ?? ""} ${p.data.stockNumber}`;
          if (p.existingId) {
            await tx.vehicle.update({ where: { id: p.existingId }, data: { ...p.data, categories: { set: p.categoryIds.map((id) => ({ id })) } } });
            if (p.features.length) {
              await tx.vehicleFeature.deleteMany({ where: { vehicleId: p.existingId } });
              await tx.vehicleFeature.createMany({ data: p.features.map((f, i) => ({ ...f, vehicleId: p.existingId!, position: i })), skipDuplicates: true });
            }
            updated += 1;
          } else {
            let slug = slugify(title).slice(0, 110);
            if (await tx.vehicle.findUnique({ where: { slug }, select: { id: true } })) slug = `${slug}-${Date.now().toString(36)}`;
            const vehicle = await tx.vehicle.create({
              data: {
                ...p.data,
                slug,
                createdById: actorId,
                publishedAt: p.data.isPublished ? new Date() : null,
                categories: { connect: p.categoryIds.map((id) => ({ id })) },
              },
            });
            if (p.features.length) {
              await tx.vehicleFeature.createMany({ data: p.features.map((f, i) => ({ ...f, vehicleId: vehicle.id, position: i })), skipDuplicates: true });
            }
            created += 1;
          }
        }
        await logActivity({ actorId, action: "vehicle.imported", entityType: "Vehicle", entityId: "csv", summary: `imported vehicles from CSV (${created} new, ${updated} updated)` }, tx);
      },
      { timeout: 60_000 },
    );
    revalidateInventory();
    return { ok: true, message: `Imported ${created} new and updated ${updated} vehicles.`, data: { results, committed: true } };
  } catch (error) {
    return unexpected("importVehiclesCsv", error);
  }
}
