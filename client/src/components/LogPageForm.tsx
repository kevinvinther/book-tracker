import { useState } from "react";
import { toDatePart } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import type { ReadThrough } from "@/lib/types";

interface LogPageFormProps {
  copySlug: string;
  startedDate: string;
  lastPage: number;
  pageCount: number | undefined;
  onUpdate: (rts?: ReadThrough[]) => void;
  onFinished: () => void;
}

export function LogPageForm({
  copySlug,
  startedDate,
  lastPage,
  onUpdate,
  onFinished,
}: LogPageFormProps) {
  const [page, setPage] = useState(String(lastPage));
  const [date, setDate] = useState(toDatePart(new Date().toISOString()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const pageNum = Number(page);
    if (Number.isNaN(pageNum)) {
      setError("Enter a page number");
      setSaving(false);
      return;
    }

    const body: Record<string, unknown> = { page: pageNum };
    if (date) body.date = date;

    fetch(`/api/copies/${copySlug}/read-throughs/${startedDate}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to log page");
        if (data.finished) onFinished();
        if (data.read_throughs) onUpdate(data.read_throughs);
        else onUpdate();
        setPage(String(data.page_log?.[data.page_log?.length - 1]?.page ?? pageNum));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to log page"))
      .finally(() => setSaving(false));
  }

  return (
    <div className="mt-3 rounded-sm border border-rule bg-muted/30 p-3">
      <form onSubmit={handleSubmit} className="flex items-end gap-3 flex-wrap">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Page</span>
          <input
            type="number"
            value={page}
            onChange={(e) => setPage(e.target.value)}
            placeholder={String(lastPage)}
            className="mt-0.5 block w-24 rounded-sm border border-rule bg-background px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-0.5 block w-36 rounded-sm border border-rule bg-background px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "…" : "Log page"}
        </Button>
      </form>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}
