import { PageHeader } from "@/components/admin/ui";
import { requirePage } from "@/lib/auth/guards";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/settings";
import { VehicleForm } from "../vehicle-form";

export const metadata = { title: "Add vehicle" };

export default async function NewVehiclePage() {
  await requirePage("vehicles:write");
  const [settings, categories] = await Promise.all([
    getSiteSettings(),
    prisma.vehicleCategory.findMany({ orderBy: { position: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <>
      <PageHeader title="Add vehicle" back={{ href: "/admin/vehicles", label: "Vehicles" }} description="Saved as a draft until you tick Published." />
      <VehicleForm
        categories={categories}
        uploadsEnabled={isCloudinaryConfigured()}
        initial={{
          stockNumber: "",
          make: "",
          model: "",
          year: new Date().getFullYear(),
          bodyType: "SUV",
          condition: "USED",
          status: "AVAILABLE",
          price: "",
          currency: settings.currency,
          priceOnRequest: false,
          mileage: "",
          transmission: "AUTOMATIC",
          fuelType: "PETROL",
          exteriorColour: "",
          showVin: false,
          isFeatured: false,
          isPublished: false,
          categoryIds: [],
          features: [],
          images: [],
        }}
      />
    </>
  );
}
