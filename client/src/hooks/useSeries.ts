import { useCallback, useEffect, useState } from "react";
import type { Series } from "@/lib/types";
import { useRefetchOnChange } from "./useWebSocket";

interface UseSeriesResult {
  series: Series | null;
  loading: boolean;
  notFound: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSeries(slug: string): UseSeriesResult {
  const [series, setSeries] = useState<Series | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSeries = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);

    fetch(`/api/series/${slug}`)
      .then((res) => {
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return null;
        }
        if (!res.ok) throw new Error("Failed to load series");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setSeries(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load series");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    return fetchSeries();
  }, [fetchSeries]);

  useRefetchOnChange(fetchSeries, (msg) => {
    if (msg.type === "series" && msg.slug === slug) return true;
    if (msg.type === "work") return true;
    return false;
  });

  return { series, loading, notFound, error, refetch: fetchSeries };
}
