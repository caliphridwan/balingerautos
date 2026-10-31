import { NextResponse } from "next/server";
import { EnquiryStatus, EnquiryType, type Prisma } from "@prisma/client";
import { AuthError, requireAction } from "@/lib/auth/guards";
import { toCsv } from "@/lib/csv";
import { enquiryScope } from "@/lib/leads/access";
import { ENQUIRY_STATUS_LABELS, ENQUIRY_TYPE_LABELS } from "@/lib/leads/labels";
import { prisma } from "@/lib/prisma";
import { vehicleTitle } from "@/lib/vehicles/format";

const HEADERS = ["reference", "createdAt", "type", "status", "customerName", "customerEmail", "customerPhone", "vehicle", "stockNumber", "assignedTo", "followUpAt", "source", "message"];

export async function GET(request: Request) {
  let user;
  try {
    user = await requireAction("data:export");
  } catch (error) {
    return NextResponse.json({ error: error instanceof AuthError ? error.message : "Forbidden" }, { status: 403 });
  }
  const params = new URL(request.url).searchParams;
  const type = Object.values(EnquiryType).find((t) => t === params.get("type"));
  const status = Object.values(EnquiryStatus).find((s) => s === params.get("status"));
  const where: Prisma.VehicleEnquiryWhereInput = { AND: [enquiryScope(user), type ? { type } : {}, status ? { status } : {}] };

  const rows = await prisma.vehicleEnquiry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10_000,
    include: {
      customer: true,
      vehicle: { select: { year: true, make: true, model: true, trim: true, stockNumber: true } },
      assignments: { where: { isActive: true }, include: { user: { select: { name: true } } } },
    },
  });
  const csv = toCsv(
    HEADERS,
    rows.map((e) => ({
      reference: e.reference,
      createdAt: e.createdAt,
      type: ENQUIRY_TYPE_LABELS[e.type],
      status: ENQUIRY_STATUS_LABELS[e.status],
      customerName: e.customer.fullName,
      customerEmail: e.customer.email,
      customerPhone: e.customer.phone,
      vehicle: e.vehicle ? vehicleTitle(e.vehicle) : "",
      stockNumber: e.vehicle?.stockNumber ?? "",
      assignedTo: e.assignments[0]?.user.name ?? "",
      followUpAt: e.followUpAt,
      source: e.source,
      message: e.message,
    })),
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="balinger-enquiries-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
