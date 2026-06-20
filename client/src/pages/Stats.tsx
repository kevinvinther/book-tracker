import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useStats } from "@/hooks/useStats";
import MetricCard from "@/components/MetricCard";
import ChartContainer from "@/components/ChartContainer";
import { Skeleton } from "@/components/Skeleton";
import { Button } from "@/components/ui/button";
import { Tooltip as UITooltip } from "@/components/Tooltip";
import type { ResolvedStats } from "@/lib/types";

type RangePreset = "this-year" | "last-year" | "all-time" | "custom";

function thisYear(): number {
  return new Date().getFullYear();
}

function rangeParams(
  preset: RangePreset,
  from: string,
  to: string,
): { year?: number; from?: string; to?: string } | undefined {
  switch (preset) {
    case "this-year":
      return { year: thisYear() };
    case "last-year":
      return { year: thisYear() - 1 };
    case "all-time":
      return undefined;
    case "custom":
      if (from && to) return { from, to };
      return undefined;
  }
}

function recordToChartData(record: Record<string, number>): { name: string; value: number }[] {
  return Object.entries(record)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ name: k, value: v }));
}

function resolvedRecordToChartData(
  record: Record<string, number>,
  labels: Record<string, string>,
): { name: string; value: number }[] {
  return Object.entries(record)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: labels[k] || k, value: v }))
    .sort((a, b) => b.value - a.value);
}

const CHART_COLORS = [
  "var(--color-primary)",
  "var(--color-verdigris)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-muted-foreground)",
];

function chartColor(i: number): string {
  return CHART_COLORS[i % CHART_COLORS.length];
}

// ── Section: Time Range Selector ──

function TimeRangeSelector({
  preset,
  onChange,
  from,
  to,
  onFromChange,
  onToChange,
}: {
  preset: RangePreset;
  onChange: (p: RangePreset) => void;
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}) {
  const presets: { value: RangePreset; label: string }[] = [
    { value: "this-year", label: "This Year" },
    { value: "last-year", label: "Last Year" },
    { value: "all-time", label: "All Time" },
    { value: "custom", label: "Custom" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {presets.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          aria-pressed={preset === p.value}
          className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
            preset === p.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-rule bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          {p.label}
        </button>
      ))}
      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
            aria-label="From date"
            className="rounded-md border border-rule bg-card px-2 py-1.5 text-xs text-foreground"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => onToChange(e.target.value)}
            aria-label="To date"
            className="rounded-md border border-rule bg-card px-2 py-1.5 text-xs text-foreground"
          />
        </div>
      )}
    </div>
  );
}

// ── Section: Simple vertical bar chart ──

function SimpleBarChart({
  data,
  dataKey,
  height,
  colorIndex,
}: {
  data: { name: string; value: number }[];
  dataKey: string;
  height: number;
  colorIndex: number;
}) {
  return (
    <div
      role="img"
      aria-label={`Bar chart: ${data.map(d => `${d.name}: ${d.value}`).join(', ')}`}
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule)" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={{ stroke: "var(--color-rule)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <RechartsTooltip
            contentStyle={{
              background: "var(--color-card)",
              border: "1px solid var(--color-rule)",
              borderRadius: "var(--radius)",
              fontSize: 12,
            }}
          />
          <Bar dataKey={dataKey} fill={chartColor(colorIndex)} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Section: Horizontal bar chart ──

function HorizontalBarChart({
  data,
  dataKey,
  height,
  colorIndex,
}: {
  data: { name: string; value: number }[];
  dataKey: string;
  height: number;
  colorIndex: number;
}) {
  return (
    <div
      role="img"
      aria-label={`Horizontal bar chart: ${data.map(d => `${d.name}: ${d.value}`).join(', ')}`}
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-rule)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={120}
          />
          <RechartsTooltip
            contentStyle={{
              background: "var(--color-card)",
              border: "1px solid var(--color-rule)",
              borderRadius: "var(--radius)",
              fontSize: 12,
            }}
          />
          <Bar dataKey={dataKey} fill={chartColor(colorIndex)} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Library Snapshot Section ──

function LibrarySection({ data }: { data: ResolvedStats }) {
  const { library } = data;

  const formatData = recordToChartData(library.copies_by_format);
  const statusData = recordToChartData(library.copies_by_status);
  const conditionData = recordToChartData(library.copies_by_condition);
  const copiesLanguageData = resolvedRecordToChartData(library.copies_by_language, data.languageLabels);
  const worksLanguageData = resolvedRecordToChartData(library.works_by_language, data.languageLabels);
  const genreData = recordToChartData(library.works_by_genre);
  const seriesData = resolvedRecordToChartData(library.works_by_series, data.seriesNames);

  return (
    <section>
      <h2 className="mb-4 font-display text-lg text-foreground">Library</h2>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <MetricCard value={library.total_works} label="Works" />
        <MetricCard value={library.total_editions} label="Editions" />
        <MetricCard value={library.total_copies} label="Copies" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ChartContainer title="Copies by Format" isEmpty={formatData.length === 0}>
          <SimpleBarChart data={formatData} dataKey="value" height={160} colorIndex={0} />
        </ChartContainer>

        <ChartContainer title="Copies by Status" isEmpty={statusData.length === 0}>
          <SimpleBarChart data={statusData} dataKey="value" height={160} colorIndex={1} />
        </ChartContainer>

        <ChartContainer title="Copies by Condition" isEmpty={conditionData.length === 0}>
          <SimpleBarChart data={conditionData} dataKey="value" height={160} colorIndex={2} />
        </ChartContainer>

        <ChartContainer title="Works by Genre" isEmpty={genreData.length === 0}>
          <HorizontalBarChart data={genreData} dataKey="value" height={Math.max(160, genreData.length * 28)} colorIndex={0} />
        </ChartContainer>

        <ChartContainer title="Copies by Language" isEmpty={copiesLanguageData.length === 0}>
          <SimpleBarChart data={copiesLanguageData} dataKey="value" height={160} colorIndex={1} />
        </ChartContainer>

        <ChartContainer title="Works by Original Language" isEmpty={worksLanguageData.length === 0}>
          <SimpleBarChart data={worksLanguageData} dataKey="value" height={160} colorIndex={0} />
        </ChartContainer>

        <ChartContainer title="Works by Series" isEmpty={seriesData.length === 0}>
          <HorizontalBarChart data={seriesData} dataKey="value" height={Math.max(160, seriesData.length * 28)} colorIndex={2} />
        </ChartContainer>
      </div>
    </section>
  );
}

// ── Reading Stats Section ──

function ReadingSection({ data }: { data: ResolvedStats }) {
  const { reading } = data;

  const ratingByWorkData = reading.avg_rating_by_work.map((r) => ({
    name: r.title,
    value: r.avg_rating,
  }));
  const ratingByAuthorData = reading.avg_rating_by_author.map((r) => ({
    name: r.name,
    value: r.avg_rating,
  }));

  return (
    <section>
      <h2 className="mb-4 font-display text-lg text-foreground">Reading</h2>

      <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-5">
        <MetricCard value={reading.finished_count} label="Finished" />
        <MetricCard value={reading.currently_reading_count} label="Reading" />
        <MetricCard value={reading.total_pages_read.toLocaleString()} label="Pages Read" />
        <MetricCard value={reading.avg_pages_per_day} label="Pages/Day" />
        <MetricCard value={reading.copies_acquired} label="Acquired" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ChartContainer
          title="Avg Rating by Work"
          isEmpty={ratingByWorkData.length === 0}
          emptyMessage="No ratings yet. Finish a read-through and rate it."
        >
          <HorizontalBarChart
            data={ratingByWorkData}
            dataKey="value"
            height={Math.max(160, ratingByWorkData.length * 28)}
            colorIndex={0}
          />
        </ChartContainer>

        <ChartContainer
          title="Avg Rating by Author"
          isEmpty={ratingByAuthorData.length === 0}
          emptyMessage="No ratings yet."
        >
          <HorizontalBarChart
            data={ratingByAuthorData}
            dataKey="value"
            height={Math.max(160, ratingByAuthorData.length * 28)}
            colorIndex={1}
          />
        </ChartContainer>
      </div>
    </section>
  );
}

// ── Notes Stats Section ──

function NotesSection({ data }: { data: ResolvedStats }) {
  const { notes } = data;

  const monthlyData = useMemo(() => {
    const sorted = Object.entries(notes.notes_per_month)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({ name: k, value: v }));
    return sorted;
  }, [notes.notes_per_month]);

  return (
    <section>
      <h2 className="mb-4 font-display text-lg text-foreground">Notes</h2>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <MetricCard value={notes.total_notes} label="Total Notes" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ChartContainer title="Notes per Month" isEmpty={monthlyData.length === 0}>
          <SimpleBarChart data={monthlyData} dataKey="value" height={200} colorIndex={0} />
        </ChartContainer>

        <ChartContainer
          title="Most Annotated Works"
          isEmpty={notes.most_annotated_works.length === 0}
          emptyMessage="No notes yet. Add a note to a book."
        >
          <ol className="space-y-2">
            {notes.most_annotated_works.map((w, i) => (
              <li key={w.slug} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-xs text-muted-foreground tabular-nums w-5 text-right">
                  #{i + 1}
                </span>
                <UITooltip content={w.title}>
                  <span className="flex-1 truncate text-foreground">{w.title}</span>
                </UITooltip>
                <span className="text-xs text-muted-foreground tabular-nums">{w.note_count} notes</span>
              </li>
            ))}
          </ol>
        </ChartContainer>
      </div>
    </section>
  );
}

// ── Page ──

export default function Stats() {
  const [preset, setPreset] = useState<RangePreset>("this-year");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const params = rangeParams(preset, from, to);
  const { data, loading, error, refetch } = useStats(params);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="mt-8 h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10 text-center">
        <p role="alert" className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={refetch} className="mt-4">Retry</Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p aria-live="polite" className="text-center text-sm text-muted-foreground">No data available.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl text-foreground">Stats</h1>
          {data.range && (
            <p className="mt-1 text-xs text-muted-foreground">
              {data.range.from} — {data.range.to}
            </p>
          )}
        </div>
        <TimeRangeSelector
          preset={preset}
          onChange={setPreset}
          from={from}
          to={to}
          onFromChange={setFrom}
          onToChange={setTo}
        />
      </div>

      <div className="flex flex-col gap-10">
        <LibrarySection data={data} />
        <ReadingSection data={data} />
        <NotesSection data={data} />
      </div>
    </div>
  );
}
