import { cn } from "@/lib/utils";
import type { Copy } from "@/lib/types";

const STAMP_CONFIG: Record<Copy["status"], { label: string; className: string }> = {
  owned: { label: "On Shelf", className: "border-verdigris text-verdigris" },
  lent: { label: "Charged Out", className: "border-stamp text-stamp" },
  lost: { label: "Lost", className: "border-destructive text-destructive" },
  sold: { label: "Withdrawn", className: "border-muted-foreground text-muted-foreground" },
  "given-away": { label: "Withdrawn", className: "border-muted-foreground text-muted-foreground" },
};

interface StatusStampProps {
  status: Copy["status"];
  className?: string;
}

export function StatusStamp({ status, className }: StatusStampProps) {
  const config = STAMP_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-block -rotate-3 rounded-[3px] border-2 px-2 py-0.5 font-mono text-[0.6875rem] font-semibold tracking-[0.08em] uppercase mix-blend-multiply dark:mix-blend-normal",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
