import { useEffect, useState } from "react";
import type { Work } from "@/lib/types";

interface UseWorksParams {
  q?: string;
  sort?: "title" | "author" | "created_at";
  order?: "asc" | "desc";
}

interface UseWorksResult {
  works: Work[];
  loading: boolean;
  error: string | null;
}

export function useWorks({ q, sort, order }: UseWorksParams): UseWorksResult {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
      .then((data) => setWorks(data))
      .catch(() => setError("Failed to load works"))
      .finally(() => setLoading(false));
  }, [q, sort, order]);

  return { works, loading, error };
}
