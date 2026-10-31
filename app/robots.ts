import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/spec-sheet", "/compare", "/favourites"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
