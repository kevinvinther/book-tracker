interface MetricCardProps {
  value: number | string;
  label: string;
  /** Marks the card as always-current (not affected by the selected time range). */
  live?: boolean;
}

export default function MetricCard({ value, label, live = false }: MetricCardProps) {
  return (
    <div
      className="relative rounded-lg border border-rule bg-card p-4 text-center"
      aria-label={`${label}: ${value}${live ? " (current, not affected by the selected time range)" : ""}`}
    >
      {live && (
        <span
          className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-verdigris/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-verdigris"
          aria-hidden="true"
        >
          <span className="size-1.5 rounded-full bg-verdigris" />
          now
        </span>
      )}
      <div className="font-display text-3xl text-primary">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}
