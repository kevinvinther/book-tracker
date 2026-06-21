import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toDatePart } from "@/lib/dates";
import type { ReadThrough } from "@/lib/types";

interface StartReadThroughFormProps {
  copySlug: string;
  isLent: boolean;
  onUpdate: (rts?: ReadThrough[]) => void;
}

export function StartReadThroughForm({ copySlug, isLent, onUpdate }: StartReadThroughFormProps) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(toDatePart(new Date().toISOString()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body: Record<string, unknown> = {};
    if (startDate) body.started_date = startDate;

    fetch(`/api/copies/${copySlug}/read-throughs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to start read-through");
        if (data.warning) console.warn(data.warning);
        if (data.read_throughs) onUpdate(data.read_throughs);
        else onUpdate();
        setOpen(false);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to start"))
      .finally(() => setSaving(false));
  }

  if (isLent) {
    return (
      <p className="text-xs text-muted-foreground">
        Cannot start a read-through while this copy is lent out.
      </p>
    );
  }

  return (
    <div>
      {open ? (
        <div className="rounded-sm border border-rule bg-muted/30 p-3">
          <form onSubmit={handleSubmit} className="flex items-end gap-3 flex-wrap">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Start date</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-0.5 block w-36 rounded-sm border border-rule bg-background px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "…" : "Start reading"}
            </Button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </form>
          {error && <p role="alert" className="mt-1.5 text-xs text-destructive">{error}</p>}
        </div>
      ) : (
        <Button variant="outline" size="xs" onClick={() => setOpen(true)}>
          Start new read-through
        </Button>
      )}
    </div>
  );
}
