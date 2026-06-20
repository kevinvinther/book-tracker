import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { toDatePart } from "@/lib/dates";
import type { ReadThrough } from "@/lib/types";

interface FinishModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copySlug: string;
  startedDate: string;
  onUpdate: (rts?: ReadThrough[]) => void;
}

export function FinishModal({ open, onOpenChange, copySlug, startedDate, onUpdate }: FinishModalProps) {
  const [rating, setRating] = useState("");
  const [finishedDate, setFinishedDate] = useState(toDatePart(new Date().toISOString()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body: Record<string, unknown> = { status: "finished" };
    const ratingNum = parseFloat(rating);
    if (!Number.isNaN(ratingNum) && ratingNum >= 0 && ratingNum <= 10) {
      body.rating = ratingNum;
    }
    if (finishedDate) body.finished_date = finishedDate;

    fetch(`/api/copies/${copySlug}/read-throughs/${startedDate}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to finish");
        if (data.read_throughs) onUpdate(data.read_throughs);
        else onUpdate();
        onOpenChange(false);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to finish"))
      .finally(() => setSaving(false));
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Mark as Finished" className="md:w-[min(20rem,90vw)]">
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Rating (0–10)</span>
          <input
            type="number"
            step="0.1"
            min="0"
            max="10"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            placeholder="Optional"
            className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Finished date</span>
          <input
            type="date"
            value={finishedDate}
            onChange={(e) => setFinishedDate(e.target.value)}
            className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Dialog.Close render={<Button type="button" variant="outline" />}>Cancel</Dialog.Close>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Finish"}</Button>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
