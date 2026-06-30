import { useCallback, useEffect, useRef, useState } from "react";
import type { StatsResponse, ResolvedStats, Series } from "@/lib/types";
import { languageName } from "@/lib/languages";
import { useRefetchOnChange } from "./useWebSocket";

interface StatsRangeParams {
  year?: number;
  from?: string;
  to?: string;
}

export type RangePreset =
  | "today"
  | "this-week"
  | "last-week"
  | "this-month"
  | "last-month"
  | "this-year"
  | "last-year"
  | "all-time"
  | "custom";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

// Monday-start week (ISO 8601), in local time.
function mondayOf(d: Date): Date {
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7; // Mon=0 .. Sun=6
  x.setDate(x.getDate() - dow);
  return x;
}

function isoRange(from: Date, to: Date): StatsRangeParams {
  return { from: from.toISOString(), to: to.toISOString() };
}

/**
 * Resolve a preset to stats query params. Today/week/month presets are computed
 * from the local clock (weeks start Monday) and sent as full-ISO from/to bounds;
 * year presets use ?year=, all-time omits the range, and custom passes the raw
 * date-input strings through.
 *
 * Compute once per preset change (e.g. via useMemo) — the "now" baseline must be
 * stable across renders to avoid a refetch loop.
 */
export function rangeParamsForPreset(
  preset: RangePreset,
  from: string,
  to: string,
): StatsRangeParams | undefined {
  const now = new Date();
  switch (preset) {
    case "today":
      return isoRange(startOfDay(now), endOfDay(now));
    case "this-week":
      return isoRange(mondayOf(now), endOfDay(now));
    case "last-week": {
      const lastMonday = mondayOf(now);
      lastMonday.setDate(lastMonday.getDate() - 7);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastSunday.getDate() + 6);
      return isoRange(lastMonday, endOfDay(lastSunday));
    }
    case "this-month": {
      const first = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      return isoRange(first, endOfDay(now));
    }
    case "last-month": {
      const first = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const last = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
      return isoRange(first, last);
    }
    case "this-year":
      return { year: now.getFullYear() };
    case "last-year":
      return { year: now.getFullYear() - 1 };
    case "all-time":
      return undefined;
    case "custom":
      if (from && to) return { from, to };
      return undefined;
  }
}

function buildQuery(params?: StatsRangeParams): string {
  if (!params) return "?year=all";
  if (params.from && params.to) {
    return `?from=${encodeURIComponent(params.from)}&to=${encodeURIComponent(params.to)}`;
  }
  if (params.year) return `?year=${params.year}`;
  return "?year=all";
}

export function useStats(params?: StatsRangeParams): {
  data: ResolvedStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [data, setData] = useState<ResolvedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seriesNamesRef = useRef<Record<string, string>>({});
  const seriesLoadedRef = useRef(false);

  const fetchStats = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const promises: [Promise<StatsResponse>, Promise<Record<string, string>>] = [
      fetch(`/api/stats${buildQuery(params)}`).then((res) => {
        if (!res.ok) throw new Error("Failed to load stats");
        return res.json();
      }),
      seriesLoadedRef.current
        ? Promise.resolve(seriesNamesRef.current)
        : fetch("/api/series")
            .then((res) => {
              if (!res.ok) throw new Error("Failed to load series");
              return res.json();
            })
            .then((seriesList: Series[]) => {
              const map: Record<string, string> = {};
              for (const s of seriesList) {
                map[s.slug] = s.name;
              }
              seriesNamesRef.current = map;
              seriesLoadedRef.current = true;
              return map;
            }),
    ];

    Promise.all(promises)
      .then(([stats, seriesNames]) => {
        if (cancelled) return;
        const languageLabels: Record<string, string> = {};
        for (const code of Object.keys(stats.library.works_by_language)) {
          languageLabels[code] = languageName(code);
        }
        setData({ ...stats, seriesNames, languageLabels });
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load stats");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params?.year, params?.from, params?.to]);

  useEffect(() => {
    return fetchStats();
  }, [fetchStats]);

  useRefetchOnChange(fetchStats, () => true);

  return { data, loading, error, refetch: fetchStats };
}
