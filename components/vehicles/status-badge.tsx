import type { VehicleCondition, VehicleStatus } from "@prisma/client";
import { STATUS_LABELS } from "@/lib/vehicles/labels";
import { cn } from "@/lib/utils";

const styles: Record<VehicleStatus, string> = {
  AVAILABLE: "bg-obsidian text-champagne-light",
  RESERVED: "bg-white text-obsidian border border-obsidian",
  SOLD: "bg-ink-muted text-white",
  ARCHIVED: "bg-ivory-soft text-ink-body",
};

export function StatusBadge({
  status,
  condition,
  className,
}: {
  status: VehicleStatus;
  condition?: VehicleCondition;
  className?: string;
}) {
  const label = status === "AVAILABLE" && condition === "NEW" ? "New · Available" : STATUS_LABELS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em]",
        styles[status],
        className,
      )}
    >
      {label}
    </span>
  );
}
