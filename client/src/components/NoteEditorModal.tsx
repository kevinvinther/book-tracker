import { useState, useEffect } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import Markdown from "react-markdown";
import type { Note, ReadThrough } from "@/lib/types";

interface NoteEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingNote?: Note;
  entityType: "work" | "edition" | "copy";
  entitySlug: string;
  readThroughs?: ReadThrough[];
  onSaved: () => void;
}

export function NoteEditorModal({
  open,
  onOpenChange,
  existingNote,
  entityType,
  entitySlug,
  readThroughs,
  onSaved,
}: NoteEditorModalProps) {
  const [body, setBody] = useState("");
  const [readThrough, setReadThrough] = useState("");
  const [contextPage, setContextPage] = useState("");
  const [tags, setTags] = useState("");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const isEdit = !!existingNote;
  const activeReadThrough = readThroughs?.find((rt) => rt.status === "reading");

  useEffect(() => {
    if (open) {
      if (existingNote) {
        setBody(existingNote.body || "");
        setReadThrough(existingNote.read_through || "");
        setContextPage(existingNote.context_page?.toString() || "");
        setTags(existingNote.tags?.join(", ") || "");
      } else {
        setBody("");
        setContextPage("");
        setTags("");
        setReadThrough("");
        if (entityType === "copy" && activeReadThrough) {
          setReadThrough(activeReadThrough.started_date);
          const lastEntry = activeReadThrough.page_log?.[activeReadThrough.page_log.length - 1];
          if (lastEntry && lastEntry.page > 0) {
            setContextPage(lastEntry.page.toString());
          }
        }
      }
      setPreview(false);
      setError("");
    }
  }, [open, existingNote, entityType, entitySlug, activeReadThrough]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload: Record<string, unknown> = {};
    payload[entityType] = entitySlug;
    if (body) payload.content = body;
    if (readThrough) payload.read_through = readThrough;
    if (contextPage) payload.context_page = parseInt(contextPage, 10);
    if (tags.trim()) payload.tags = tags.split(",").map((t) => t.trim()).filter(Boolean);

    const url = isEdit ? `/api/notes/${existingNote!.slug}` : "/api/notes";
    const method = isEdit ? "PATCH" : "POST";

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save note");
        onSaved();
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to save note"))
      .finally(() => setSaving(false));
  }

  function handleDelete() {
    if (!existingNote || !window.confirm("Delete this note?")) return;
    setDeleting(true);
    setError("");

    fetch(`/api/notes/${existingNote.slug}`, { method: "DELETE" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to delete note");
        onSaved();
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to delete note"))
      .finally(() => setDeleting(false));
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title={isEdit ? "Edit Note" : "New Note"} className="md:w-[min(36rem,90vw)]">
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setPreview(false)}
            className={`rounded-sm px-2.5 py-2 md:py-1 font-medium transition-colors ${
              !preview
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setPreview(true)}
            className={`rounded-sm px-2.5 py-2 md:py-1 font-medium transition-colors ${
              preview
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Preview
          </button>
        </div>

        {preview ? (
          <div className="min-h-[200px] rounded-sm border border-rule bg-background px-4 py-3 text-sm leading-relaxed prose prose-sm max-w-none">
            {body ? (
              <Markdown>{body}</Markdown>
            ) : (
              <span className="text-muted-foreground">Nothing to preview.</span>
            )}
          </div>
        ) : (
          <label className="block">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder="Write your note in Markdown…"
              className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-2 text-sm font-mono leading-relaxed focus:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y min-h-[200px]"
            />
          </label>
        )}

        {entityType === "copy" && readThroughs && readThroughs.length > 0 && (
          <label className="block">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Read-through</span>
            <select
              value={readThrough}
              onChange={(e) => setReadThrough(e.target.value)}
              className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">(none)</option>
              {readThroughs.map((rt) => (
                <option key={rt.started_date} value={rt.started_date}>
                  {rt.status} — {rt.started_date.slice(0, 10)}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Context page</span>
            <input
              type="number"
              value={contextPage}
              onChange={(e) => setContextPage(e.target.value)}
              placeholder="e.g. 104"
              className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Tags</span>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="thoughts, spoilers"
              className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <div>
            {isEdit && (
              <Button type="button" variant="outline" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Dialog.Close render={<Button type="button" variant="outline" size="sm" />}>Cancel</Dialog.Close>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
