import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import type { Work } from "@/lib/types";

interface EditWorkModalProps {
  work: Work;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function slugFromWikilink(wikilink: string): string {
  const match = wikilink.match(/^\[\[(?:authors|series)\/(.+)\]\]$/);
  return match ? match[1] : wikilink;
}

export function EditWorkModal({ work, open, onOpenChange, onSaved }: EditWorkModalProps) {
  const [title, setTitle] = useState(work.title);
  const [subtitle, setSubtitle] = useState(work.subtitle ?? "");
  const [authorSlugs, setAuthorSlugs] = useState(work.authors.map(slugFromWikilink).join(", "));
  const [genres, setGenres] = useState((work.genres ?? []).join(", "));
  const [description, setDescription] = useState(work.description ?? "");
  const [seriesSlug, setSeriesSlug] = useState(work.series ? slugFromWikilink(work.series) : "");
  const [seriesPosition, setSeriesPosition] = useState(work.series_position?.toString() ?? "");
  const [primaryCover, setPrimaryCover] = useState(work.primary_cover ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError("");

    const authors = authorSlugs
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((slug) => `[[authors/${slug}]]`);

    // null (not undefined) signals "clear this field" — JSON.stringify keeps
    // null keys but drops undefined ones, and the PATCH route only clears a
    // field when it sees an explicit null.
    const body: Record<string, unknown> = {
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      authors,
      genres: genres
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean),
      description: description.trim() || null,
      series: seriesSlug.trim() ? `[[series/${seriesSlug.trim()}]]` : null,
      series_position: seriesPosition ? Number(seriesPosition) : null,
      primary_cover: primaryCover.trim() || null,
    };

    fetch(`/api/works/${work.slug}`, {
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
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[85vh] w-[min(32rem,90vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-sm border border-rule bg-card p-6 shadow-xl">
          <Dialog.Title className="font-display text-xl text-foreground">Edit Work</Dialog.Title>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <label className="block">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Subtitle</span>
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Authors (slugs, comma-separated)
              </span>
              <input
                value={authorSlugs}
                onChange={(e) => setAuthorSlugs(e.target.value)}
                className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Genres (comma-separated)
              </span>
              <input
                value={genres}
                onChange={(e) => setGenres(e.target.value)}
                className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Series slug</span>
                <input
                  value={seriesSlug}
                  onChange={(e) => setSeriesSlug(e.target.value)}
                  className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Position</span>
                <input
                  type="number"
                  value={seriesPosition}
                  onChange={(e) => setSeriesPosition(e.target.value)}
                  className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Cover filename (in attachments/)
              </span>
              <input
                value={primaryCover}
                onChange={(e) => setPrimaryCover(e.target.value)}
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
