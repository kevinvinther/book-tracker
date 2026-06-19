import { cn } from "@/lib/utils";
import type { ReadThrough } from "@/lib/types";

const STATUS_CONFIG: Record<ReadThrough["status"], { label: string; className: string }> = {
  reading: { label: "Reading", className: "bg-verdigris text-verdigris-foreground" },
  paused: { label: "Paused", className: "bg-stamp text-stamp-foreground" },
  finished: { label: "Finished", className: "bg-muted text-muted-foreground" },
  dnf: { label: "DNF", className: "bg-secondary text-secondary-foreground" },
};

interface ReadThroughStatusBadgeProps {
  status: ReadThrough["status"];
  className?: string;
}

export function ReadThroughStatusBadge({ status, className }: ReadThroughStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
