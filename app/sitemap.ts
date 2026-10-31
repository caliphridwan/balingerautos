import type { MetadataRoute } from "next";
import { VehicleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const vehicles = await prisma.vehicle.findMany({
    where: { isPublished: true, status: { in: [VehicleStatus.AVAILABLE, VehicleStatus.RESERVED] } },
    select: { slug: true, updatedAt: true },
  });
  return [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/inventory"), changeFrequency: "daily", priority: 0.9 },
    ...["/about", "/services", "/financing", "/trade-in", "/contact"].map((path) => ({
      url: absoluteUrl(path),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...vehicles.map((v) => ({
      url: absoluteUrl(`/inventory/${v.slug}`),
      lastModified: v.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
