import { useCallback, useEffect, useState } from "react";
import type { CopyFull } from "@/lib/types";
import { useRefetchOnChange } from "./useWebSocket";

interface UseCopyResult {
  copy: CopyFull | null;
  loading: boolean;
  notFound: boolean;
  error: string | null;
  refetch: () => void;
  updateCopy: (data: CopyFull | ((prev: CopyFull) => CopyFull)) => void;
}

export function useCopy(slug: string): UseCopyResult {
  const [copy, setCopy] = useState<CopyFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCopy = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);

    fetch(`/api/copies/${slug}`)
      .then((res) => {
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return null;
        }
        if (!res.ok) throw new Error("Failed to load copy");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setCopy(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load copy");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    return fetchCopy();
  }, [fetchCopy]);

  useRefetchOnChange(fetchCopy, (msg) => msg.type === "copy" && msg.slug === slug);

  const updateCopy = useCallback((data: CopyFull | ((prev: CopyFull) => CopyFull)) => {
    setCopy((prev) => {
      if (typeof data === "function") {
        return prev ? (data as (prev: CopyFull) => CopyFull)(prev) : null;
      }
      return data;
    });
    setLoading(false);
    setError(null);
    setNotFound(false);
  }, []);

  return { copy, loading, notFound, error, refetch: fetchCopy, updateCopy };
}
