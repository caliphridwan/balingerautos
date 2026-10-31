import "server-only";
import { revalidatePath } from "next/cache";

/** Refreshes every public page a vehicle can appear on. */
export function revalidateInventory(...slugs: Array<string | null | undefined>): void {
  revalidatePath("/");
  revalidatePath("/inventory");
  revalidatePath("/sitemap.xml");
  for (const slug of slugs) {
    if (slug) {
      revalidatePath(`/inventory/${slug}`);
      revalidatePath(`/spec-sheet/${slug}`);
    }
  }
}

/** Site-wide content (settings, FAQs, testimonials) touches every public page. */
export function revalidateSite(): void {
  revalidatePath("/", "layout");
}
