import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/30" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[min(20rem,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-sm border border-rule bg-card p-6 shadow-xl">
          <Dialog.Title className="font-display text-lg text-foreground">Mark as Finished</Dialog.Title>
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close render={<Button type="button" variant="outline" />}>Cancel</Dialog.Close>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Finish"}</Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
