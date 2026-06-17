import { cn } from "@/lib/utils";
import type { Copy } from "@/lib/types";

const STATUS_CONFIG: Record<Copy["status"], { label: string; className: string }> = {
  owned: { label: "On Shelf", className: "bg-verdigris text-verdigris-foreground" },
  lent: { label: "Lent Out", className: "bg-stamp text-stamp-foreground" },
  lost: { label: "Lost", className: "bg-destructive text-primary-foreground" },
  sold: { label: "Sold", className: "bg-muted text-muted-foreground" },
  "given-away": { label: "Given Away", className: "bg-muted text-muted-foreground" },
};

interface StatusStampProps {
  status: Copy["status"];
  className?: string;
}

export function StatusStamp({ status, className }: StatusStampProps) {
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
