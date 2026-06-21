import { useCallback, useEffect, useRef, useState } from "react";
import type { StatsResponse, ResolvedStats, Series } from "@/lib/types";
import { languageName } from "@/lib/languages";
import { useRefetchOnChange } from "./useWebSocket";

interface StatsRangeParams {
  year?: number;
  from?: string;
  to?: string;
}

function buildQuery(params?: StatsRangeParams): string {
  if (!params) return "?year=all";
  if (params.from && params.to) return `?from=${params.from}&to=${params.to}`;
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
