import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { requirePage } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { ENQUIRY_STATUS_LABELS, ENQUIRY_TYPE_LABELS } from "@/lib/leads/labels";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { formatInZone } from "@/lib/time";
import { vehicleTitle } from "@/lib/vehicles/format";
import { STATUS_LABELS } from "@/lib/vehicles/labels";
import { enquiryStatusTone } from "../../enquiries/tones";
import { VehicleForm } from "../vehicle-form";

export const metadata = { title: "Edit vehicle" };

export default async function EditVehiclePage({ params, searchParams }: { params: { id: string }; searchParams: { created?: string } }) {
  const user = await requirePage("vehicles:read");
  const canWrite = can(user.role, "vehicles:write");
  const [vehicle, categories, settings] = await Promise.all([
    prisma.vehicle.findUnique({
      where: { id: params.id },
      include: {
        images: { orderBy: { position: "asc" } },
        features: { orderBy: [{ group: "asc" }, { position: "asc" }] },
        categories: { select: { id: true } },
        enquiries: { orderBy: { createdAt: "desc" }, take: 10, include: { customer: { select: { fullName: true } } } },
        _count: { select: { enquiries: true, testDrives: true } },
      },
    }),
    prisma.vehicleCategory.findMany({ orderBy: { position: "asc" }, select: { id: true, name: true } }),
    getSiteSettings(),
  ]);
  if (!vehicle) notFound();

  return (
    <>
      <PageHeader
        title={vehicleTitle(vehicle)}
        back={{ href: "/admin/vehicles", label: "Vehicles" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone="dark">{STATUS_LABELS[vehicle.status]}</Badge>
            {!vehicle.isPublished ? <Badge tone="outline">Draft</Badge> : null}
            {vehicle.reservedUntil && vehicle.status === "RESERVED" ? <Badge tone="amber">Held until {formatInZone(vehicle.reservedUntil, settings.timezone, settings.locale, { dateStyle: "medium" })}</Badge> : null}
            <span>
              Stock {vehicle.stockNumber} · {vehicle.viewCount} views · {vehicle._count.enquiries} enquiries · {vehicle._count.testDrives} test drives
            </span>
          </span>
        }
      />
      {searchParams.created ? (
        <p role="status" className="mb-5 border border-[#C3D9CA] bg-[#E4EEE7] px-4 py-3 text-sm text-[#1E4A2E]">
          Vehicle created. Add photos in step 5, then tick Published when it's ready.
        </p>
      ) : null}

      <div className="grid gap-6 2xl:grid-cols-[1fr_340px]">
        {canWrite ? (
          <VehicleForm
            id={vehicle.id}
            categories={categories}
            uploadsEnabled={isCloudinaryConfigured()}
            publicUrl={`/inventory/${vehicle.slug}`}
            initial={{
              stockNumber: vehicle.stockNumber,
              make: vehicle.make,
              model: vehicle.model,
              trim: vehicle.trim ?? "",
              year: vehicle.year,
              bodyType: vehicle.bodyType,
              condition: vehicle.condition,
              status: vehicle.status,
              price: Number(vehicle.price),
              currency: vehicle.currency,
              priceOnRequest: vehicle.priceOnRequest,
              mileage: vehicle.mileage,
              transmission: vehicle.transmission,
              fuelType: vehicle.fuelType,
              drivetrain: vehicle.drivetrain ?? "",
              engineCapacityCc: vehicle.engineCapacityCc ?? "",
              horsepower: vehicle.horsepower ?? "",
              doors: vehicle.doors ?? "",
              seats: vehicle.seats ?? "",
              exteriorColour: vehicle.exteriorColour,
              interiorColour: vehicle.interiorColour ?? "",
              vin: vehicle.vin ?? "",
              showVin: vehicle.showVin,
              description: vehicle.description ?? "",
              inspectionNotes: vehicle.inspectionNotes ?? "",
              inspectedAt: vehicle.inspectedAt ? vehicle.inspectedAt.toISOString().slice(0, 10) : "",
              serviceHistory: vehicle.serviceHistory ?? "",
              previousOwners: vehicle.previousOwners ?? "",
              videoUrl: vehicle.videoUrl ?? "",
              isFeatured: vehicle.isFeatured,
              isPublished: vehicle.isPublished,
              metaTitle: vehicle.metaTitle ?? "",
              metaDescription: vehicle.metaDescription ?? "",
              slug: vehicle.slug,
              categoryIds: vehicle.categories.map((c) => c.id),
              features: vehicle.features.map((f) => ({ group: f.group, label: f.label })),
              images: vehicle.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt ?? "" })),
            }}
          />
        ) : (
          <Card title="Vehicle">
            <p className="text-sm text-ink-body">You have read-only access to vehicles.</p>
            <Link href={`/inventory/${vehicle.slug}`} target="_blank" className="mt-3 inline-block text-sm font-semibold underline">
              View on website
            </Link>
          </Card>
        )}

        <Card title="Recent enquiries" padded={false}>
          {vehicle.enquiries.length === 0 ? (
            <p className="px-5 py-4 text-sm text-ink-muted">No enquiries yet.</p>
          ) : (
            <ul>
              {vehicle.enquiries.map((e) => (
                <li key={e.id} className="border-b border-ivory-soft last:border-0">
                  <Link href={`/admin/enquiries/${e.id}`} className="flex items-center justify-between gap-2 px-5 py-3 text-sm hover:bg-ivory">
                    <span className="flex flex-col">
                      <span className="font-semibold">{e.customer.fullName}</span>
                      <span className="text-xs text-ink-muted">
                        {ENQUIRY_TYPE_LABELS[e.type]} · {formatInZone(e.createdAt, settings.timezone, settings.locale, { dateStyle: "short" })}
                      </span>
                    </span>
                    <Badge tone={enquiryStatusTone[e.status]}>{ENQUIRY_STATUS_LABELS[e.status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
