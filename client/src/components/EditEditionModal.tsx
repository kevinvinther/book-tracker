import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import type { EditionFull } from "@/lib/types";

interface EditEditionModalProps {
  edition: EditionFull;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditEditionModal({ edition, open, onOpenChange, onSaved }: EditEditionModalProps) {
  const [isbn, setIsbn] = useState(edition.isbn ?? "");
  const [publisher, setPublisher] = useState(edition.publisher ?? "");
  const [publishDate, setPublishDate] = useState(edition.publish_date?.slice(0, 10) ?? "");
  const [pageCount, setPageCount] = useState(edition.page_count?.toString() ?? "");
  const [format, setFormat] = useState(edition.format ?? "");
  const [language, setLanguage] = useState(edition.language ?? "");
  const [contributors, setContributors] = useState(
    (edition.contributors ?? []).map((c) => `${c.name}${c.role ? `:${c.role}` : ""}`).join(", ")
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const contributorList = contributors
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const colonIdx = s.indexOf(":");
        if (colonIdx === -1) return { name: s };
        return { name: s.slice(0, colonIdx).trim(), role: s.slice(colonIdx + 1).trim() };
      });

    const body: Record<string, unknown> = {
      isbn: isbn.trim() || null,
      publisher: publisher.trim() || null,
      publish_date: publishDate || null,
      page_count: pageCount ? Number(pageCount) : null,
      format: format.trim() || null,
      language: language.trim() || null,
      contributors: contributorList.length > 0 ? contributorList : null,
    };

    fetch(`/api/editions/${edition.slug}`, {
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
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Edit Edition" className="md:w-[min(28rem,90vw)]">
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <label className="block">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">ISBN</span>
          <input value={isbn} onChange={(e) => setIsbn(e.target.value)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
        <label className="block">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Publisher</span>
          <input value={publisher} onChange={(e) => setPublisher(e.target.value)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
        <label className="block">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Publish Date</span>
          <input type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Pages</span>
            <input type="number" value={pageCount} onChange={(e) => setPageCount(e.target.value)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
          <label className="block">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Format</span>
            <input value={format} onChange={(e) => setFormat(e.target.value)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Language</span>
          <input value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
        <label className="block">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Contributors (Name:Role, comma-separated)
          </span>
          <input value={contributors} onChange={(e) => setContributors(e.target.value)} className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Dialog.Close render={<Button type="button" variant="outline" />}>Cancel</Dialog.Close>
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
