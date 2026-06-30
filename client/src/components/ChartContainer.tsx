import type { ReactNode } from "react";

interface ChartContainerProps {
  title: string;
  children: ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
  height?: number;
  /** Optional interactive content rendered below the chart (e.g. a "Show more" toggle). */
  footer?: ReactNode;
}

export default function ChartContainer({
  title,
  children,
  isEmpty = false,
  emptyMessage = "No data yet",
  height = 200,
  footer,
}: ChartContainerProps) {
  return (
    <div className="rounded-lg border border-rule bg-card p-4">
      <h3 className="mb-3 font-display text-sm text-muted-foreground">{title}</h3>
      {isEmpty ? (
        <div className="flex items-center justify-center text-xs text-muted-foreground" style={{ height }}>
          {emptyMessage}
        </div>
      ) : (
        <div role="img" aria-label={title}>
          {children}
        </div>
      )}
      {!isEmpty && footer}
    </div>
  );
}
