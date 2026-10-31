/**
 * Diagnoses missing images:  npm run check:images
 * Lists every image the database points to and tests each URL from this machine.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function test(url: string): Promise<string> {
  try {
    const res = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" } });
    return res.ok || res.status === 206 ? "OK" : `HTTP ${res.status}`;
  } catch (error) {
    return `FAILED (${error instanceof Error ? error.message : "network error"})`;
  }
}

async function main() {
  const [settings, images, vehicles] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "default" } }),
    prisma.vehicleImage.findMany({ include: { vehicle: { select: { stockNumber: true, make: true, model: true } } }, orderBy: [{ vehicleId: "asc" }, { position: "asc" }] }),
    prisma.vehicle.count(),
  ]);

  console.log(`\nVehicles: ${vehicles} · vehicle photos in database: ${images.length}`);
  if (images.length === 0) console.log("→ No vehicle photos saved. Run:  npm run db:seed   (then restart npm run dev)\n");

  const site: Array<[string, string | null | undefined]> = [
    ["Hero", settings?.heroImageUrl],
    ["About", settings?.aboutImageUrl],
    ["Promo", settings?.promoImageUrl],
  ];
  let broken = 0;
  console.log("\nSite images:");
  for (const [label, url] of site) {
    if (!url) {
      console.log(`  ${label.padEnd(8)} not set → run npm run db:seed`);
      continue;
    }
    const r = await test(url);
    if (r !== "OK") broken++;
    console.log(`  ${label.padEnd(8)} ${r.padEnd(10)} ${url}`);
  }

  console.log("\nVehicle photos:");
  for (const img of images) {
    const r = await test(img.url);
    if (r !== "OK") broken++;
    console.log(`  ${img.vehicle.stockNumber.padEnd(9)} ${r.padEnd(10)} ${img.vehicle.make} ${img.vehicle.model} → ${img.url}`);
  }

  console.log(
    broken
      ? `\n${broken} image(s) failed to load. Paste this output to Claude to replace them.\n`
      : "\nAll images load from this machine. If the site still shows placeholders, restart `npm run dev` (next.config.mjs changes need a restart) and hard-refresh the browser.\n",
  );
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
