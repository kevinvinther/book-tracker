import type { Note } from "@/lib/types";
import { formatDate } from "@/lib/dates";

interface NoteCardProps {
  note: Note;
  onClick: () => void;
}

function excerpt(body: string, maxLen = 200): string {
  if (body.length <= maxLen) return body;
  return body.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
}

export function NoteCard({ note, onClick }: NoteCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-sm border border-rule bg-card px-4 py-3 text-left transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{formatDate(note.date)}</span>
        {note.read_through_meta && (
          <span className="inline-flex items-center gap-1 rounded-sm bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            {note.read_through_meta.status}
            {note.context_page != null && ` · pg ${note.context_page}`}
          </span>
        )}
        {note.tags && note.tags.length > 0 && (
          <span className="text-[11px]">
            {note.tags.map((t) => `#${t}`).join(" ")}
          </span>
        )}
      </div>

      {note.body && (
        <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">
          {excerpt(note.body)}
        </p>
      )}

      {(note.copy_meta || note.edition_meta || note.work_meta) && !note.read_through_meta && (
        <div className="mt-1.5 text-[11px] text-muted-foreground/70">
          {note.copy_meta && (
            <span>Copy: {note.copy_meta.condition ? `${note.copy_meta.condition}` : note.copy_meta.slug}</span>
          )}
          {note.edition_meta && !note.copy_meta && (
            <span>Edition: {note.edition_meta.publisher || note.edition_meta.slug}</span>
          )}
          {note.work_meta && !note.edition_meta && !note.copy_meta && (
            <span>{note.work_meta.title}</span>
          )}
        </div>
      )}
    </button>
  );
}
