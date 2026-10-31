import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  return (
    <Link
      href="/"
      aria-label="Balinger Autos — home"
      className={cn("flex flex-col gap-0.5 text-white", className)}
    >
      <span className={cn("font-display font-medium tracking-[0.18em]", size === "lg" ? "text-[28px]" : "text-2xl")}>
        BALINGER
      </span>
      <span className="text-[10px] font-semibold tracking-[0.62em] text-champagne">AUTOS</span>
    </Link>
  );
}
