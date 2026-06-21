import { useEffect, useState, useRef, useCallback } from "react";
import type { SearchResponse } from "@/lib/types";
import { useRefetchOnChange } from "./useWebSocket";

interface UseSearchResult {
  results: SearchResponse["results"] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSearch(query: string): UseSearchResult {
  const [results, setResults] = useState<SearchResponse["results"] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [version, setVersion] = useState(0);
  const queryRef = useRef(query);
  queryRef.current = query;

  const fetchSearch = useCallback(() => {
    const q = queryRef.current;
    if (!q.trim()) {
      setResults(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
      .then((res) => {
        if (!res.ok) throw new Error("Search failed");
        return res.json();
      })
      .then((data: SearchResponse) => {
        setResults(data.results);
      })
      .catch(() => {
        setError("Search failed");
        setResults(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query.trim()) {
      setResults(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    debounceRef.current = setTimeout(() => {
      fetchSearch();
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, version, fetchSearch]);

  useRefetchOnChange(
    useCallback(() => setVersion((v) => v + 1), []),
    () => true,
  );

  const refetch = useCallback(() => {
    fetchSearch();
  }, [fetchSearch]);

  return { results, isLoading, error, refetch };
}
