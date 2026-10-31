import { Car } from "lucide-react";
import { SafeImage } from "@/components/shared/safe-image";
import { cn } from "@/lib/utils";

interface VehicleImageProps {
  image?: { url: string; alt: string | null } | null;
  fallbackAlt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}

function Placeholder({ label, className }: { label: string; className?: string }) {
  return (
    <div role="img" aria-label={`${label} — photo coming soon`} className={cn("texture-hairline absolute inset-0 flex items-center justify-center bg-graphite", className)}>
      <Car aria-hidden="true" className="h-10 w-10 text-graphite-muted" strokeWidth={1} />
    </div>
  );
}

/**
 * Vehicle photograph, or a refined placeholder when there's no photo (or it
 * fails to load). The parent sets the aspect ratio and must be `relative`.
 */
export function VehicleImage({ image, fallbackAlt, sizes, priority, className }: VehicleImageProps) {
  if (!image) return <Placeholder label={fallbackAlt} className={className} />;
  return (
    <SafeImage
      src={image.url}
      alt={image.alt ?? fallbackAlt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]", className)}
      fallback={<Placeholder label={fallbackAlt} className={className} />}
    />
  );
}
