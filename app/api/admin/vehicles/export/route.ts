import { NextResponse } from "next/server";
import { AuthError, requireAction } from "@/lib/auth/guards";
import { toCsv } from "@/lib/csv";
import { prisma } from "@/lib/prisma";

const HEADERS = [
  "stockNumber", "make", "model", "trim", "year", "bodyType", "condition", "status", "price", "currency", "priceOnRequest",
  "mileage", "transmission", "fuelType", "drivetrain", "engineCapacityCc", "horsepower", "doors", "seats",
  "exteriorColour", "interiorColour", "vin", "showVin", "description", "isFeatured", "isPublished",
  "categories", "features", "slug", "viewCount", "createdAt", "updatedAt",
];

/** Full inventory as CSV — the same format the importer accepts. */
export async function GET() {
  try {
    await requireAction("data:export");
  } catch (error) {
    return NextResponse.json({ error: error instanceof AuthError ? error.message : "Forbidden" }, { status: 403 });
  }
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { createdAt: "desc" },
    include: { categories: { select: { slug: true } }, features: { orderBy: [{ group: "asc" }, { position: "asc" }] } },
  });
  const rows = vehicles.map((v) => ({
    ...v,
    price: Number(v.price).toFixed(2),
    categories: v.categories.map((c) => c.slug).join("|"),
    features: v.features.map((f) => `${f.group}:${f.label}`).join("|"),
  }));
  const csv = toCsv(HEADERS, rows);
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="balinger-inventory-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
