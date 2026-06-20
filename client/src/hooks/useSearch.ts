import { useEffect, useState, useRef } from "react";
import type { SearchResponse } from "@/lib/types";

interface UseSearchResult {
  results: SearchResponse["results"] | null;
  isLoading: boolean;
  error: string | null;
}

export function useSearch(query: string): UseSearchResult {
  const [results, setResults] = useState<SearchResponse["results"] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

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
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}`)
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
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  return { results, isLoading, error };
}
