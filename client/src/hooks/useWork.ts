import { useCallback, useEffect, useState } from "react";
import type { Work } from "@/lib/types";

interface UseWorkResult {
  work: Work | null;
  loading: boolean;
  notFound: boolean;
  error: string | null;
  refetch: () => void;
}

export function useWork(slug: string): UseWorkResult {
  const [work, setWork] = useState<Work | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWork = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);

    fetch(`/api/works/${slug}`)
      .then((res) => {
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return null;
        }
        if (!res.ok) throw new Error("Failed to load work");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setWork(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load work");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    return fetchWork();
  }, [fetchWork]);

  return { work, loading, notFound, error, refetch: fetchWork };
}
