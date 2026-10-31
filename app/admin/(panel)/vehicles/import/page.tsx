import { Card, PageHeader } from "@/components/admin/ui";
import { requirePage } from "@/lib/auth/guards";
import { ImportForm } from "./import-form";

export const metadata = { title: "Import vehicles" };

const COLUMNS = [
  ["stockNumber", "Required. Unique, e.g. BA-24017"],
  ["make, model, year", "Required"],
  ["trim", "Optional"],
  ["bodyType", "SUV, SEDAN, COUPE, CONVERTIBLE, HATCHBACK, WAGON, PICKUP, CROSSOVER, VAN"],
  ["condition", "NEW, USED, CERTIFIED_PRE_OWNED"],
  ["status", "AVAILABLE (default), RESERVED, SOLD, ARCHIVED"],
  ["price, currency", "Price required (number). Currency defaults to NGN (naira)"],
  ["mileage", "Required (number)"],
  ["transmission", "AUTOMATIC, MANUAL, SEMI_AUTOMATIC, CVT"],
  ["fuelType", "PETROL, DIESEL, HYBRID, PLUG_IN_HYBRID, ELECTRIC"],
  ["drivetrain", "Optional: FWD, RWD, AWD, FOUR_WD"],
  ["engineCapacityCc, horsepower, doors, seats", "Optional numbers"],
  ["exteriorColour", "Required"],
  ["interiorColour, vin, description", "Optional"],
  ["isFeatured, isPublished", "true / false (default false)"],
  ["categories", "Category slugs separated by |, e.g. suvs|luxury"],
  ["features", "GROUP:label separated by |, e.g. KEY:Panoramic roof|SAFETY:360° camera"],
];

export default async function ImportVehiclesPage() {
  await requirePage("vehicles:import");
  return (
    <>
      <PageHeader
        title="Import vehicles from CSV"
        back={{ href: "/admin/vehicles", label: "Vehicles" }}
        description="Upload a file to preview it first. Nothing is saved until you confirm the import. Photos are added afterwards from each vehicle's page."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <ImportForm />
        <Card title="Columns">
          <p className="mb-3 text-sm text-ink-muted">
            Tip: export your current inventory to get a correctly formatted file to edit.
          </p>
          <dl className="flex flex-col text-sm">
            {COLUMNS.map(([k, v]) => (
              <div key={k} className="border-b border-ivory-soft py-2">
                <dt className="font-mono text-xs font-semibold">{k}</dt>
                <dd className="text-ink-muted">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </>
  );
}
