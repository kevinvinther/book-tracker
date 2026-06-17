import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import type { Author } from "@/lib/types";

interface EditAuthorModalProps {
  author: Author;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditAuthorModal({ author, open, onOpenChange, onSaved }: EditAuthorModalProps) {
  const [name, setName] = useState(author.name);
  const [aliases, setAliases] = useState((author.aliases ?? []).join(", "));
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
      aliases: aliases
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
    };

    fetch(`/api/authors/${author.slug}`, {
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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/30" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[85vh] w-[min(24rem,90vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-sm border border-rule bg-card p-6 shadow-xl">
          <Dialog.Title className="font-display text-xl text-foreground">Edit Author</Dialog.Title>
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
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Aliases (comma-separated)
              </span>
              <input
                value={aliases}
                onChange={(e) => setAliases(e.target.value)}
                className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close render={<Button type="button" variant="outline" />}>Cancel</Dialog.Close>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
