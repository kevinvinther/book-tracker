import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useStats, rangeParamsForPreset, type RangePreset } from "@/hooks/useStats";
import MetricCard from "@/components/MetricCard";
import ChartContainer from "@/components/ChartContainer";
import { Skeleton } from "@/components/Skeleton";
import { Button } from "@/components/ui/button";
import { Tooltip as UITooltip } from "@/components/Tooltip";
import type { ResolvedStats } from "@/lib/types";

const GENRE_SERIES_CAP = 8;

interface ChartDatum {
  name: string;
  value: number;
  href?: string;
}

function recordToChartData(record: Record<string, number>): ChartDatum[] {
  return Object.entries(record)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ name: k, value: v }));
}

function resolvedRecordToChartData(
  record: Record<string, number>,
  labels: Record<string, string>,
): ChartDatum[] {
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

const PRESETS: { value: RangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this-week", label: "This week" },
  { value: "last-week", label: "Last week" },
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "this-year", label: "This year" },
  { value: "last-year", label: "Last year" },
  { value: "all-time", label: "All time" },
  { value: "custom", label: "Custom" },
];

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
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
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
  data: ChartDatum[];
  dataKey: string;
  height: number;
  colorIndex: number;
}) {
  return (
    <div
      role="img"
      aria-label={`Bar chart: ${data.map((d) => `${d.name}: ${d.value}`).join(", ")}`}
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
  onBarClick,
}: {
  data: ChartDatum[];
  dataKey: string;
  height: number;
  colorIndex: number;
  onBarClick?: (datum: ChartDatum) => void;
}) {
  return (
    <div
      role="img"
      aria-label={`Horizontal bar chart: ${data.map((d) => `${d.name}: ${d.value}`).join(", ")}`}
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
          <Bar
            dataKey={dataKey}
            fill={chartColor(colorIndex)}
            radius={[0, 3, 3, 0]}
            cursor={onBarClick ? "pointer" : undefined}
            onClick={(d: unknown) => {
              const datum = d as ChartDatum | undefined;
              if (onBarClick && datum?.href) onBarClick(datum);
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Section: Capped horizontal bar chart with show-more toggle ──

function CappedBarChart({
  title,
  data,
  colorIndex,
  onBarClick,
}: {
  title: string;
  data: ChartDatum[];
  colorIndex: number;
  onBarClick?: (datum: ChartDatum) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = data.length > GENRE_SERIES_CAP;
  const shown = expanded ? data : data.slice(0, GENRE_SERIES_CAP);

  return (
    <ChartContainer
      title={title}
      isEmpty={data.length === 0}
      footer={
        hasMore ? (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="mt-3 text-xs font-medium text-primary hover:underline"
          >
            {expanded ? "Show less" : `Show ${data.length - GENRE_SERIES_CAP} more`}
          </button>
        ) : null
      }
    >
      <HorizontalBarChart
        data={shown}
        dataKey="value"
        height={Math.max(160, shown.length * 28)}
        colorIndex={colorIndex}
        onBarClick={onBarClick}
      />
    </ChartContainer>
  );
}

// ── Zone: This period (range-scoped stats) ──

function PeriodZone({ data }: { data: ResolvedStats }) {
  const navigate = useNavigate();
  const { reading, notes } = data;

  const velocityData: ChartDatum[] = reading.pages_per_period.map((p) => ({
    name: p.period,
    value: p.pages,
  }));

  const ratingByWorkData: ChartDatum[] = reading.avg_rating_by_work.map((r) => ({
    name: r.title,
    value: r.avg_rating,
    href: `/works/${r.slug}`,
  }));
  const ratingByAuthorData: ChartDatum[] = reading.avg_rating_by_author.map((r) => ({
    name: r.name,
    value: r.avg_rating,
    href: `/authors/${r.slug}`,
  }));

  const monthlyData: ChartDatum[] = Object.entries(notes.notes_per_month)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => ({ name: k, value: v }));

  return (
    <section>
      <h2 className="mb-1 font-display text-lg text-foreground">This period</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Scoped to the selected time range.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard value={reading.finished_count} label="Finished" />
        <MetricCard value={reading.total_pages_read.toLocaleString()} label="Pages Read" />
        <MetricCard value={reading.avg_pages_per_day} label="Pages/Day" />
        <MetricCard value={reading.copies_acquired} label="Acquired" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ChartContainer
          title="Reading Velocity"
          isEmpty={velocityData.every((d) => d.value === 0)}
          emptyMessage="No pages logged in this period."
        >
          <SimpleBarChart data={velocityData} dataKey="value" height={200} colorIndex={1} />
        </ChartContainer>

        <ChartContainer title="Notes per Month" isEmpty={monthlyData.length === 0}>
          <SimpleBarChart data={monthlyData} dataKey="value" height={200} colorIndex={0} />
        </ChartContainer>

        <ChartContainer
          title="Avg Rating by Work"
          isEmpty={ratingByWorkData.length === 0}
          emptyMessage="No ratings in this period."
        >
          <HorizontalBarChart
            data={ratingByWorkData}
            dataKey="value"
            height={Math.max(160, ratingByWorkData.length * 28)}
            colorIndex={0}
            onBarClick={(d) => d.href && navigate(d.href)}
          />
        </ChartContainer>

        <ChartContainer
          title="Avg Rating by Author"
          isEmpty={ratingByAuthorData.length === 0}
          emptyMessage="No ratings in this period."
        >
          <HorizontalBarChart
            data={ratingByAuthorData}
            dataKey="value"
            height={Math.max(160, ratingByAuthorData.length * 28)}
            colorIndex={1}
            onBarClick={(d) => d.href && navigate(d.href)}
          />
        </ChartContainer>
      </div>

      <div className="mt-6">
        <MetricCard value={notes.total_notes} label="Notes Written" />
      </div>
    </section>
  );
}

// ── Zone: Library & all-time (always-current snapshot) ──

function LibraryAllTimeZone({ data }: { data: ResolvedStats }) {
  const navigate = useNavigate();
  const { library, reading, notes } = data;

  const formatData = recordToChartData(library.copies_by_format);
  const statusData = recordToChartData(library.copies_by_status);
  const conditionData = recordToChartData(library.copies_by_condition);
  const copiesLanguageData = resolvedRecordToChartData(library.copies_by_language, data.languageLabels);
  const worksLanguageData = resolvedRecordToChartData(library.works_by_language, data.languageLabels);

  const genreData: ChartDatum[] = recordToChartData(library.works_by_genre).map((d) => ({
    ...d,
    href: `/library?genre=${encodeURIComponent(d.name)}`,
  }));
  const seriesData: ChartDatum[] = Object.entries(library.works_by_series)
    .filter(([, v]) => v > 0)
    .map(([slug, v]) => ({
      name: data.seriesNames[slug] || slug,
      value: v,
      href: `/series/${slug}`,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <section>
      <h2 className="mb-1 font-display text-lg text-foreground">Library &amp; all-time</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Current snapshot — not affected by the selected time range.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard value={library.total_works} label="Works" />
        <MetricCard value={library.total_editions} label="Editions" />
        <MetricCard value={library.total_copies} label="Copies" />
        <MetricCard value={reading.currently_reading_count} label="Reading" live />
        <MetricCard value={library.unread_count} label="Unread" live />
        <MetricCard value={`${library.percent_read}%`} label="Read" live />
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

        <ChartContainer title="Copies by Language" isEmpty={copiesLanguageData.length === 0}>
          <SimpleBarChart data={copiesLanguageData} dataKey="value" height={160} colorIndex={1} />
        </ChartContainer>

        <ChartContainer title="Works by Original Language" isEmpty={worksLanguageData.length === 0}>
          <SimpleBarChart data={worksLanguageData} dataKey="value" height={160} colorIndex={0} />
        </ChartContainer>

        <CappedBarChart
          title="Works by Genre"
          data={genreData}
          colorIndex={0}
          onBarClick={(d) => d.href && navigate(d.href)}
        />

        <CappedBarChart
          title="Works by Series"
          data={seriesData}
          colorIndex={2}
          onBarClick={(d) => d.href && navigate(d.href)}
        />

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
                  <Link to={`/works/${w.slug}`} className="flex-1 truncate text-foreground hover:text-primary">
                    {w.title}
                  </Link>
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
  const [preset, setPreset] = useState<RangePreset>("this-month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  // Compute once per preset/custom-date change — a stable "now" baseline avoids a refetch loop.
  const params = useMemo(() => rangeParamsForPreset(preset, from, to), [preset, from, to]);
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
      <div className="mb-8 flex flex-col gap-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h1 className="font-display text-2xl text-foreground">Stats</h1>
          {data.range && (
            <p className="text-xs text-muted-foreground">
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

      <div className="flex flex-col gap-12">
        <PeriodZone data={data} />
        <LibraryAllTimeZone data={data} />
      </div>
    </div>
  );
}
