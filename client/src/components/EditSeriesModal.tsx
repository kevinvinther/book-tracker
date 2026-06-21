import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import type { Series } from "@/lib/types";

interface EditSeriesModalProps {
  series: Series;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditSeriesModal({ series, open, onOpenChange, onSaved }: EditSeriesModalProps) {
  const [name, setName] = useState(series.name);
  const [totalWorks, setTotalWorks] = useState(series.total_works?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError("");

    const body: Record<string, unknown> = {
      name: name.trim(),
      total_works: totalWorks ? Number(totalWorks) : null,
    };

    fetch(`/api/series/${series.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to save");
        onSaved();
        onOpenChange(false);
      })
      .catch(() => setError("Failed to save changes"))
      .finally(() => setSaving(false));
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Edit Series" className="md:w-[min(24rem,90vw)]">
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <label className="block">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Total works</span>
          <input
            type="number"
            value={totalWorks}
            onChange={(e) => setTotalWorks(e.target.value)}
            className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Dialog.Close render={<Button type="button" variant="outline" />}>Cancel</Dialog.Close>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
