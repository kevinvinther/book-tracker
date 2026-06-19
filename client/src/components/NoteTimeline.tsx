import { useState } from "react";
import { useNotes } from "@/hooks/useNotes";
import { NoteCard } from "@/components/NoteCard";
import { NoteEditorModal } from "@/components/NoteEditorModal";
import { Button } from "@/components/ui/button";
import type { Note, ReadThrough } from "@/lib/types";

interface NoteTimelineProps {
  entityType: "work" | "edition" | "copy";
  entitySlug: string;
  readThroughs?: ReadThrough[];
}

export function NoteTimeline({ entityType, entitySlug, readThroughs }: NoteTimelineProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | undefined>(undefined);

  const filterParams: Record<string, string> = {};
  if (entityType === "work") filterParams.work = entitySlug;
  if (entityType === "edition") filterParams.edition = entitySlug;
  if (entityType === "copy") filterParams.copy = entitySlug;

  const { notes, loading, refetch } = useNotes(filterParams);

  function handleAdd() {
    setEditingNote(undefined);
    setEditorOpen(true);
  }

  function handleEdit(note: Note) {
    setEditingNote(note);
    setEditorOpen(true);
  }

  function handleSaved() {
    setEditorOpen(false);
    setEditingNote(undefined);
    refetch();
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Notes</h2>
        <Button variant="outline" size="sm" onClick={handleAdd}>
          Add Note
        </Button>
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
      ) : notes.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No notes yet.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {notes.map((note) => (
            <NoteCard key={note.slug} note={note} onClick={() => handleEdit(note)} />
          ))}
        </div>
      )}

      <NoteEditorModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        existingNote={editingNote}
        entityType={entityType}
        entitySlug={entitySlug}
        readThroughs={readThroughs}
        onSaved={handleSaved}
      />
    </section>
  );
}
