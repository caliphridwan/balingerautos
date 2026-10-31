import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimitKey } from "@/lib/rate-limit-core";

/** Counts a vehicle page view (beacon from the detail page; one per IP per vehicle per hour). */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!/^[a-z0-9]{20,40}$/i.test(params.id)) return new NextResponse(null, { status: 400 });
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return new NextResponse(null, { status: 403 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimitKey(`view:${params.id}:${ip}`, 1, 60 * 60_000).ok) {
    await prisma.vehicle.updateMany({ where: { id: params.id, isPublished: true }, data: { viewCount: { increment: 1 } } });
  }
  return new NextResponse(null, { status: 204 });
}
