import { useCallback, useEffect, useState } from "react";
import type { Note } from "@/lib/types";

interface UseNotesParams {
  work?: string;
  edition?: string;
  copy?: string;
  q?: string;
}

interface UseNotesResult {
  notes: Note[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useNotes(params: UseNotesParams = {}): UseNotesResult {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = new URLSearchParams();
  if (params.work) query.set("work", params.work);
  if (params.edition) query.set("edition", params.edition);
  if (params.copy) query.set("copy", params.copy);
  if (params.q) query.set("q", params.q);
  const qs = query.toString();

  const fetchNotes = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/notes${qs ? `?${qs}` : ""}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load notes");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setNotes(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load notes");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [qs]);

  useEffect(() => {
    return fetchNotes();
  }, [fetchNotes]);

  return { notes, loading, error, refetch: fetchNotes };
}
