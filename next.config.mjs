/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // WebP only: AVIF encoding is very slow on small hosting plans (e.g. Render
    // free/starter) and can time out, which leaves photo slots empty.
    formats: ["image/webp"],
    // Escape hatch: set IMAGES_UNOPTIMIZED=true to serve photos straight from
    // Cloudinary/Unsplash without the Next.js resizer.
    unoptimized: process.env.IMAGES_UNOPTIMIZED === "true",
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Demo photography from the seed (Unsplash). Remove once all photos are your own.
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
