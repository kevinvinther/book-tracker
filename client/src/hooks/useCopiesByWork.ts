import { useEffect, useState } from "react";
import type { Copy } from "@/lib/types";

interface UseCopiesByWorkResult {
  copies: Copy[];
  loading: boolean;
  error: string | null;
}

export function useCopiesByWork(slug: string): UseCopiesByWorkResult {
  const [copies, setCopies] = useState<Copy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/copies?work=${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load copies");
        return res.json();
      })
      .then((data) => setCopies(data))
      .catch(() => setError("Failed to load copies"))
      .finally(() => setLoading(false));
  }, [slug]);

  return { copies, loading, error };
}
