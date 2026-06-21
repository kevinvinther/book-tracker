import { useCallback, useEffect, useRef, useState } from "react";
import type { DashboardResponse } from "@/lib/types";
import { useRefetchOnChange } from "./useWebSocket";

interface UseDashboardResult {
  data: DashboardResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboard(): UseDashboardResult {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const fetchDashboard = useCallback(() => {
    cancelledRef.current = false;
    setLoading(true);
    setError(null);

    fetch("/api/dashboard")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard");
        return res.json();
      })
      .then((json) => {
        if (!cancelledRef.current) setData(json);
      })
      .catch(() => {
        if (!cancelledRef.current) setError("Failed to load dashboard");
      })
      .finally(() => {
        if (!cancelledRef.current) setLoading(false);
      });

    return () => {
      cancelledRef.current = true;
    };
  }, []);

  useEffect(() => {
    return fetchDashboard();
  }, [fetchDashboard]);

  useRefetchOnChange(
    fetchDashboard,
    (msg) =>
      msg.type === "copy" ||
      msg.type === "edition" ||
      msg.type === "work" ||
      msg.type === "note",
  );

  return { data, loading, error, refetch: fetchDashboard };
}
