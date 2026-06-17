import { useEffect, useState } from "react";
import type { Edition } from "@/lib/types";

interface UseEditionsByWorkResult {
  editions: Edition[];
  loading: boolean;
  error: string | null;
}

export function useEditionsByWork(slug: string): UseEditionsByWorkResult {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/editions?work=${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load editions");
        return res.json();
      })
      .then((data) => setEditions(data))
      .catch(() => setError("Failed to load editions"))
      .finally(() => setLoading(false));
  }, [slug]);

  return { editions, loading, error };
}
