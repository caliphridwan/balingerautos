import { NextResponse } from "next/server";
import { AuthError, requireAction } from "@/lib/auth/guards";
import { toCsv } from "@/lib/csv";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireAction("data:export");
  } catch (error) {
    return NextResponse.json({ error: error instanceof AuthError ? error.message : "Forbidden" }, { status: 403 });
  }
  const subs = await prisma.newsletterSubscriber.findMany({ where: { isSubscribed: true }, orderBy: { createdAt: "desc" } });
  return new NextResponse(toCsv(["email", "source", "createdAt"], subs), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="balinger-newsletter-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
