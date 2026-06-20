import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import type { CopyFull } from "@/lib/types";

const STATUSES = ["owned", "lost", "given-away", "sold"] as const;

interface EditCopyModalProps {
  copy: CopyFull;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function hasOutstandingLoans(copy: CopyFull): boolean {
  return (copy.loans ?? []).some((l) => !l.returned_date);
}

export function EditCopyModal({ copy, open, onOpenChange, onSaved }: EditCopyModalProps) {
  const [condition, setCondition] = useState(copy.condition ?? "");
  const [location, setLocation] = useState(copy.location ?? "");
  const [coverImage, setCoverImage] = useState(copy.cover_image ?? "");
  const [status, setStatus] = useState<string>(copy.status);
  const [acquisitionDate, setAcquisitionDate] = useState(copy.acquisition_date?.slice(0, 10) ?? "");
  const [acquisitionSource, setAcquisitionSource] = useState(copy.acquisition_source ?? "");
  const [priceAmount, setPriceAmount] = useState(copy.price_amount?.toString() ?? "");
  const [priceCurrency, setPriceCurrency] = useState(copy.price_currency ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const outstanding = hasOutstandingLoans(copy);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body: Record<string, unknown> = {
      condition: condition.trim() || null,
      location: location.trim() || null,
      cover_image: coverImage.trim() || null,
      status,
      acquisition_date: acquisitionDate || null,
      acquisition_source: acquisitionSource.trim() || null,
      price_amount: priceAmount ? Number(priceAmount) : null,
      price_currency: priceCurrency.trim() || null,
    };

    fetch(`/api/copies/${copy.slug}`, {
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
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Edit Copy" className="md:w-[min(28rem,90vw)]">
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Condition</span>
            <input value={condition} onChange={(e) => setCondition(e.target.value)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
          <label className="block">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Location</span>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Cover image filename</span>
          <input value={coverImage} onChange={(e) => setCoverImage(e.target.value)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
        <label className="block">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {STATUSES.map((s) => (
              <option key={s} value={s} disabled={s === "owned" && outstanding}>
                {s.replace("-", " ")}{s === "owned" && outstanding ? " (outstanding loans)" : ""}
              </option>
            ))}
          </select>
          {outstanding && status === "owned" && (
            <p className="mt-0.5 text-xs text-muted-foreground">Owned cannot be selected while there are outstanding loans.</p>
          )}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Acquired</span>
            <input type="date" value={acquisitionDate} onChange={(e) => setAcquisitionDate(e.target.value)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
          <label className="block">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Source</span>
            <input value={acquisitionSource} onChange={(e) => setAcquisitionSource(e.target.value)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Price</span>
            <input type="number" step="0.01" value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
          <label className="block">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Currency</span>
            <input value={priceCurrency} onChange={(e) => setPriceCurrency(e.target.value)} placeholder="USD" className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Dialog.Close render={<Button type="button" variant="outline" />}>Cancel</Dialog.Close>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
