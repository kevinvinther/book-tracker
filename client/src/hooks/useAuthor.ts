import { useCallback, useEffect, useState } from "react";
import type { Author } from "@/lib/types";

interface UseAuthorResult {
  author: Author | null;
  loading: boolean;
  notFound: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAuthor(slug: string): UseAuthorResult {
  const [author, setAuthor] = useState<Author | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAuthor = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);

    fetch(`/api/authors/${slug}`)
      .then((res) => {
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return null;
        }
        if (!res.ok) throw new Error("Failed to load author");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setAuthor(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load author");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    return fetchAuthor();
  }, [fetchAuthor]);

  return { author, loading, notFound, error, refetch: fetchAuthor };
}
