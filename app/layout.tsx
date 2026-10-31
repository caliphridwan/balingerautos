import type { Metadata, Viewport } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import { getSiteSettings } from "@/lib/settings";
import { absoluteUrl } from "@/lib/utils";
import "./globals.css";

const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const sans = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = settings.seoTitle ?? `${settings.businessName} — ${settings.tagline}`;
  const description =
    settings.seoDescription ??
    "Exceptional new and pre-owned vehicles, carefully selected. Browse our collection, book a test drive and speak with our team.";
  return {
    metadataBase: new URL(absoluteUrl("/")),
    title: { default: title, template: `%s | ${settings.businessName}` },
    description,
    openGraph: {
      type: "website",
      siteName: settings.businessName,
      title,
      description,
      images: settings.ogImageUrl ? [{ url: settings.ogImageUrl }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: "/" },
  };
}

export const viewport: Viewport = {
  themeColor: "#101114",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
