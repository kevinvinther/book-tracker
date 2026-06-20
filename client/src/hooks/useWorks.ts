import { useCallback, useEffect, useRef, useState } from "react";
import type { Work } from "@/lib/types";
import { useRefetchOnChange } from "./useWebSocket";

interface UseWorksParams {
  q?: string;
  sort?: "title" | "author" | "created_at";
  order?: "asc" | "desc";
}

interface UseWorksResult {
  works: Work[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useWorks({ q, sort, order }: UseWorksParams): UseWorksResult {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const fetchWorks = useCallback(() => {
    cancelledRef.current = false;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sort) params.set("sort", sort);
    if (order) params.set("order", order);

    setLoading(true);
    setError(null);

    fetch(`/api/works?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load works");
        return res.json();
      })
      .then((data) => {
        if (!cancelledRef.current) setWorks(data);
      })
      .catch(() => {
        if (!cancelledRef.current) setError("Failed to load works");
      })
      .finally(() => {
        if (!cancelledRef.current) setLoading(false);
      });

    return () => {
      cancelledRef.current = true;
    };
  }, [q, sort, order]);

  useEffect(() => {
    return fetchWorks();
  }, [fetchWorks]);

  useRefetchOnChange(fetchWorks, (msg) =>
    msg.type === "work" || msg.type === "edition" || msg.type === "copy",
  );

  return { works, loading, error, refetch: fetchWorks };
}
