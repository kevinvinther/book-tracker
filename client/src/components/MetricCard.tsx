interface MetricCardProps {
  value: number | string;
  label: string;
}

export default function MetricCard({ value, label }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-rule bg-card p-4 text-center" aria-label={`${label}: ${value}`}>
      <div className="font-display text-3xl text-primary">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}
