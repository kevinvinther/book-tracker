import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";

const STATUSES = ["owned", "lent", "lost", "given-away", "sold"] as const;

interface AddCopyModalProps {
  editionSlug: string;
  workSlug: string;
  workTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function AddCopyModal({ editionSlug, workSlug, workTitle, open, onOpenChange, onSaved }: AddCopyModalProps) {
  const [condition, setCondition] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<string>("owned");
  const [acquisitionSource, setAcquisitionSource] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body: Record<string, unknown> = {
      edition: editionSlug,
      work: workSlug,
      condition: condition.trim() || undefined,
      location: location.trim() || undefined,
      status,
      acquisition_source: acquisitionSource.trim() || undefined,
    };

    fetch("/api/copies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to create copy");
        onSaved();
        onOpenChange(false);
      })
      .catch(() => setError("Failed to create copy"))
      .finally(() => setSaving(false));
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/30" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[85vh] w-[min(24rem,90vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-sm border border-rule bg-card p-6 shadow-xl">
          <Dialog.Title className="font-display text-xl text-foreground">Add Copy of {workTitle}</Dialog.Title>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <label className="block">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Condition</span>
              <input value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="fine, good, fair, poor" className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Location</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Living Room" className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>
            <label className="block">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace("-", " ")}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Acquisition source</span>
              <input value={acquisitionSource} onChange={(e) => setAcquisitionSource(e.target.value)} placeholder="Bookshop, Gift, ..." className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </label>

            <p className="text-xs text-muted-foreground">Edition: {editionSlug}</p>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close render={<Button type="button" variant="outline" />}>Cancel</Dialog.Close>
              <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Add Copy"}</Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
