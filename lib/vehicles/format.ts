/** "2024 Mercedes-Benz GLC 300 4MATIC AMG Line" */
export function vehicleTitle(v: { year: number; make: string; model: string; trim: string | null }): string {
  return [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
}
