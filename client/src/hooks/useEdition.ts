import { useCallback, useEffect, useState } from "react";
import type { EditionFull } from "@/lib/types";
import { useRefetchOnChange } from "./useWebSocket";

interface UseEditionResult {
  edition: EditionFull | null;
  loading: boolean;
  notFound: boolean;
  error: string | null;
  refetch: () => void;
}

export function useEdition(slug: string): UseEditionResult {
  const [edition, setEdition] = useState<EditionFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEdition = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);

    fetch(`/api/editions/${slug}`)
      .then((res) => {
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return null;
        }
        if (!res.ok) throw new Error("Failed to load edition");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setEdition(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load edition");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    return fetchEdition();
  }, [fetchEdition]);

  useRefetchOnChange(fetchEdition, (msg) => msg.type === "edition" && msg.slug === slug);

  return { edition, loading, notFound, error, refetch: fetchEdition };
}
