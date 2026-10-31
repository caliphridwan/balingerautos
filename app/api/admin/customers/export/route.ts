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
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { enquiries: true, testDrives: true } } },
  });
  const csv = toCsv(
    ["fullName", "email", "phone", "enquiries", "testDrives", "createdAt"],
    customers.map((c) => ({ ...c, enquiries: c._count.enquiries, testDrives: c._count.testDrives })),
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="balinger-customers-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
