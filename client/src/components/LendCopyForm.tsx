import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toDatePart } from "@/lib/dates";

interface LendCopyFormProps {
  copySlug: string;
  onSaved: () => void;
}

export function LendCopyForm({ copySlug, onSaved }: LendCopyFormProps) {
  const [open, setOpen] = useState(false);
  const [borrowerName, setBorrowerName] = useState("");
  const [lentDate, setLentDate] = useState(toDatePart(new Date().toISOString()));
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!borrowerName.trim()) {
      setError("Borrower name is required");
      return;
    }
    setSaving(true);
    setError("");

    const body: Record<string, unknown> = {
      borrower_name: borrowerName.trim(),
    };
    if (lentDate) body.lent_date = lentDate;
    if (expectedReturnDate) body.expected_return_date = expectedReturnDate;

    fetch(`/api/copies/${copySlug}/loans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create loan");
        if (data.warning) console.warn(data.warning);
        onSaved();
        setOpen(false);
        setBorrowerName("");
        setLentDate(toDatePart(new Date().toISOString()));
        setExpectedReturnDate("");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"))
      .finally(() => setSaving(false));
  }

  if (!open) {
    return (
      <Button variant="outline" size="xs" onClick={() => setOpen(true)}>
        Lend this copy
      </Button>
    );
  }

  return (
    <div className="rounded-sm border border-rule bg-muted/30 p-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Borrower name *</span>
          <input
            value={borrowerName}
            onChange={(e) => setBorrowerName(e.target.value)}
            placeholder="Sarah"
            className="mt-0.5 block w-full max-w-xs rounded-sm border border-rule bg-background px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            autoFocus
          />
        </label>
        <div className="flex gap-3 flex-wrap">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Lent date</span>
            <input
              type="date"
              value={lentDate}
              onChange={(e) => setLentDate(e.target.value)}
              className="mt-0.5 block w-36 rounded-sm border border-rule bg-background px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Expected return</span>
            <input
              type="date"
              value={expectedReturnDate}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
              className="mt-0.5 block w-36 rounded-sm border border-rule bg-background px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? "…" : "Lend"}
          </Button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
