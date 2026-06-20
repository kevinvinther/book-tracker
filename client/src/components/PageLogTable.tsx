import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDate, toDatePart } from "@/lib/dates";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { PageLog, ReadThrough } from "@/lib/types";

interface PageLogTableProps {
  entries: PageLog[];
  pageCount: number | undefined;
  status: ReadThrough["status"];
  copySlug: string;
  startedDate: string;
  onUpdate: (rts?: ReadThrough[]) => void;
}

export function PageLogTable({ entries, pageCount, status, copySlug, startedDate, onUpdate }: PageLogTableProps) {
  // Sort newest-first: compare date parts only, break ties by page descending
  const sorted = [...entries].sort((a, b) => {
    const dateA = a.date.slice(0, 10);
    const dateB = b.date.slice(0, 10);
    if (dateB > dateA) return 1;
    if (dateB < dateA) return -1;
    return (Number(b.page) || 0) - (Number(a.page) || 0);
  });

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-rule">
            <th className="px-1 py-2 md:py-1.5 text-left font-medium text-muted-foreground">Date</th>
            <th className="px-1 py-2 md:py-1.5 text-right font-medium text-muted-foreground">Page</th>
            <th className="px-1 py-2 md:py-1.5 text-right font-medium text-muted-foreground">%</th>
            <th className="px-1 py-2 md:py-1.5 text-right font-medium text-muted-foreground">Δ pages</th>
            <th className="px-1 py-2 md:py-1.5 text-right font-medium text-muted-foreground">Δ days</th>
            <th className="w-6 px-1 py-2 md:py-1.5" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry, i) => {
            const prevEntry = sorted[i + 1];
            const isBaseline = sorted.length > 0 && i === sorted.length - 1 && entry.page === 0;

            return (
              <PageLogRow
                key={`${toDatePart(entry.date)}-${entry.page}-${i}`}
                entry={entry}
                prevEntry={prevEntry}
                pageCount={pageCount}
                isBaseline={isBaseline}
                isActive={status === "reading"}
                copySlug={copySlug}
                startedDate={startedDate}
                onUpdate={onUpdate}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface PageLogRowProps {
  entry: PageLog;
  prevEntry: PageLog | undefined;
  pageCount: number | undefined;
  isBaseline: boolean;
  isActive: boolean;
  copySlug: string;
  startedDate: string;
  onUpdate: (rts?: ReadThrough[]) => void;
}

function PageLogRow({
  entry,
  prevEntry,
  pageCount,
  isBaseline,
  isActive,
  copySlug,
  startedDate,
  onUpdate,
}: PageLogRowProps) {
  const [editing, setEditing] = useState(false);
  const [editPage, setEditPage] = useState(String(entry.page));
  const [editDate, setEditDate] = useState(toDatePart(entry.date));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function handleSave() {
    setSaving(true);
    setError("");

    const body: Record<string, unknown> = {};
    const newPage = Number(editPage);
    if (!Number.isNaN(newPage) && newPage !== entry.page) body.page = newPage;
    if (editDate !== toDatePart(entry.date)) body.date = editDate;

    if (Object.keys(body).length === 0) {
      setEditing(false);
      setSaving(false);
      return;
    }

    fetch(`/api/copies/${copySlug}/read-throughs/${startedDate}/entries/${toDatePart(entry.date)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Failed to save" }));
          throw new Error(data.error || "Failed to save");
        }
        const data = await res.json();
        if (data.read_throughs) onUpdate(data.read_throughs);
        else onUpdate();
        setEditing(false);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to save"))
      .finally(() => setSaving(false));
  }

  function handleDelete() {
    setDeleting(true);
    fetch(`/api/copies/${copySlug}/read-throughs/${startedDate}/entries/${toDatePart(entry.date)}`, {
      method: "DELETE",
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Failed to delete" }));
          throw new Error(data.error || "Failed to delete");
        }
        const data = await res.json();
        if (data.read_throughs) onUpdate(data.read_throughs);
        else onUpdate();
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to delete"))
      .finally(() => {
        setDeleting(false);
        setDeleteOpen(false);
      });
  }

  function handleCancel() {
    setEditPage(String(entry.page));
    setEditDate(toDatePart(entry.date));
    setEditing(false);
    setError("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  }

  const pct = pageCount != null ? `${Math.round((entry.page / pageCount) * 100)}%` : "—";
  const deltaPages = prevEntry
    ? entry.page > prevEntry.page
      ? `+${entry.page - prevEntry.page}`
      : "—"
    : "—";
  const deltaDays = prevEntry
    ? String(Math.round((Date.parse(entry.date.slice(0, 10)) - Date.parse(prevEntry.date.slice(0, 10))) / 86400000))
    : "—";

  if (editing) {
    return (
      <tr className="border-b border-rule/50 bg-secondary/30">
        <td className="px-1 py-2 md:py-1">
          <input
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            onKeyDown={handleKeyDown}
              aria-label="Date"
              className="w-full rounded-sm border border-rule bg-background px-1 py-0.5 text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </td>
          <td className="px-1 py-2 md:py-1">
            <input
              type="number"
              value={editPage}
              onChange={(e) => setEditPage(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Page number"
              className="w-20 rounded-sm border border-rule bg-background px-1 py-0.5 text-right text-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </td>
        <td className="px-1 py-2 md:py-1 text-right text-muted-foreground">{pct}</td>
        <td className="px-1 py-2 md:py-1 text-right text-muted-foreground">{deltaPages}</td>
        <td className="px-1 py-2 md:py-1 text-right text-muted-foreground">{deltaDays}</td>
        <td className="px-1 py-2 md:py-1 text-right">
          {error && <span className="mr-1 text-destructive">{error}</span>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mr-1 text-xs text-primary hover:underline py-1 md:py-0"
          >
            {saving ? "…" : "Save"}
          </button>
          <button type="button" onClick={handleCancel} className="text-xs text-muted-foreground hover:text-foreground py-1 md:py-0">
            Cancel
          </button>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr
        className={cn(
          "border-b border-rule/50 hover:bg-muted/50",
          isActive && "cursor-pointer",
        )}
        tabIndex={isActive ? 0 : -1}
        role="button"
        onClick={() => isActive && setEditing(true)}
        onKeyDown={(e) => {
          if (isActive && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setEditing(true);
          }
        }}
      >
        <td className="px-1 py-2 md:py-1 whitespace-nowrap">{formatDate(entry.date)}</td>
        <td className="px-1 py-2 md:py-1 text-right tabular-nums">{entry.page}</td>
        <td className="px-1 py-2 md:py-1 text-right tabular-nums text-muted-foreground">{pct}</td>
        <td className="px-1 py-2 md:py-1 text-right tabular-nums text-muted-foreground">{deltaPages}</td>
        <td className="px-1 py-2 md:py-1 text-right tabular-nums text-muted-foreground">{deltaDays}</td>
        <td className="px-1 py-2 md:py-1 text-right">
          {isActive && !isBaseline && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteOpen(true);
              }}
              className="text-xs text-muted-foreground hover:text-destructive py-1 md:py-0"
            >
              Delete
            </button>
          )}
        </td>
      </tr>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete page log entry"
        message={`Delete the entry for ${formatDate(entry.date)} (page ${entry.page})?`}
        confirmLabel="Delete entry"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
}
