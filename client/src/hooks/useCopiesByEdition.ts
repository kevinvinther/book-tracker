import { useEffect, useState } from "react";
import type { Copy } from "@/lib/types";

interface UseCopiesByEditionResult {
  copies: Copy[];
  loading: boolean;
  error: string | null;
}

export function useCopiesByEdition(editionSlug: string): UseCopiesByEditionResult {
  const [copies, setCopies] = useState<Copy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editionSlug) {
      setCopies([]);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/copies?edition=${editionSlug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load copies");
        return res.json();
      })
      .then((data) => {
        setCopies(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load copies");
        setLoading(false);
      });
  }, [editionSlug]);

  return { copies, loading, error };
}
