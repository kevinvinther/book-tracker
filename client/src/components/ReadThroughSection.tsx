import { useState } from "react";
import { ReadThroughStatusBadge } from "@/components/ReadThroughStatusBadge";
import { PageLogTable } from "@/components/PageLogTable";
import { LogPageForm } from "@/components/LogPageForm";
import { FinishModal } from "@/components/FinishModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { formatDate, toDatePart } from "@/lib/dates";
import type { ReadThrough } from "@/lib/types";

interface ReadThroughSectionProps {
  rt: ReadThrough;
  copySlug: string;
  pageCount: number | undefined;
  onUpdate: (rts?: ReadThrough[]) => void;
}

export function ReadThroughSection({ rt, copySlug, pageCount, onUpdate }: ReadThroughSectionProps) {
  const startedDate = toDatePart(rt.started_date);
  const finishedDate = rt.finished_date ? formatDate(rt.finished_date) : null;
  const lastEntry = rt.page_log[rt.page_log.length - 1];
  const lastPage = lastEntry?.page ?? 0;
  const isActive = rt.status === "reading";
  const isFinished = rt.status === "finished";
  const isPaused = rt.status === "paused";
  const isDnf = rt.status === "dnf";

  const [finishOpen, setFinishOpen] = useState(false);
  const [showFinishedBanner, setShowFinishedBanner] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [undoOpen, setUndoOpen] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [actionError, setActionError] = useState("");

  // DNF state
  const [dnfOpen, setDnfOpen] = useState(false);
  const [dnfPage, setDnfPage] = useState(String(lastPage));
  const [dnfDate, setDnfDate] = useState(toDatePart(new Date().toISOString()));
  const [dnfSaving, setDnfSaving] = useState(false);

  function handleStatusChange(status: string, extra?: Record<string, unknown>) {
    setActionError("");
    const body: Record<string, unknown> = { status, ...extra };
    return fetch(`/api/copies/${copySlug}/read-throughs/${startedDate}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        if (data.warning) console.warn(data.warning);
        if (data.read_throughs) onUpdate(data.read_throughs);
      })
      .catch((err) => {
        setActionError(err instanceof Error ? err.message : "Failed");
        throw err;
      });
  }

  function handlePause() {
    handleStatusChange("paused");
  }

  function handleResume() {
    handleStatusChange("resumed");
  }

  function handleDnfSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDnfSaving(true);
    setActionError("");

    const extra: Record<string, unknown> = {};
    const pageNum = Number(dnfPage);
    if (!Number.isNaN(pageNum)) extra.page = pageNum;
    if (dnfDate) extra.finished_date = dnfDate;

    handleStatusChange("dnf", extra)
      .then(() => setDnfOpen(false))
      .finally(() => setDnfSaving(false));
  }

  function handleDeleteReadThrough() {
    setDeleting(true);
    fetch(`/api/copies/${copySlug}/read-throughs/${startedDate}`, {
      method: "DELETE",
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Failed to delete" }));
          throw new Error(data.error || "Failed to delete");
        }
        const data = await res.json();
        if (data.read_throughs) onUpdate(data.read_throughs);
      })
      .catch((err) => setActionError(err instanceof Error ? err.message : "Failed to delete"))
      .finally(() => {
        setDeleting(false);
        setDeleteOpen(false);
      });
  }

  function handleUndoLastEntry() {
    if (rt.page_log.length <= 1) return;
    const lastLogEntry = rt.page_log[rt.page_log.length - 1];
    setUndoing(true);
    fetch(
      `/api/copies/${copySlug}/read-throughs/${startedDate}/entries/${toDatePart(lastLogEntry.date)}`,
      { method: "DELETE" },
    )
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Failed to undo" }));
          throw new Error(data.error || "Failed to undo");
        }
        const data = await res.json();
        if (data.read_throughs) onUpdate(data.read_throughs);
      })
      .catch((err) => setActionError(err instanceof Error ? err.message : "Failed to undo"))
      .finally(() => {
        setUndoing(false);
        setUndoOpen(false);
      });
  }

  return (
    <div className="border-t border-rule pt-5">
      <div className="flex flex-wrap items-center gap-3">
        <ReadThroughStatusBadge status={rt.status} />
        <span className="text-sm text-foreground">
          {formatDate(rt.started_date)}
          {finishedDate && ` — ${finishedDate}`}
        </span>
        {isFinished && rt.rating != null && (
          <span className="text-sm tabular-nums text-muted-foreground">★ {rt.rating.toFixed(1)}</span>
        )}
      </div>

      {pageCount != null && isActive && (
        <p className="mt-1 text-xs text-muted-foreground">
          {lastPage} / {pageCount} pages · {Math.round((lastPage / pageCount) * 100)}%
        </p>
      )}

      {isDnf && (
        <p className="mt-1 text-xs text-muted-foreground">Stopped at page {lastPage}{pageCount != null ? ` of ${pageCount}` : ""}</p>
      )}

      <PageLogTable
        entries={rt.page_log}
        pageCount={pageCount}
        status={rt.status}
        copySlug={copySlug}
        startedDate={startedDate}
        onUpdate={onUpdate}
      />

      {isActive && (
        <>
          <LogPageForm
            copySlug={copySlug}
            startedDate={startedDate}
            lastPage={lastPage}
            pageCount={pageCount}
            onUpdate={onUpdate}
            onFinished={() => {
              setShowFinishedBanner(true);
              setFinishOpen(true);
            }}
          />
          {showFinishedBanner && (
            <div className="mt-3 flex items-center justify-between rounded-sm bg-verdigris/10 border border-verdigris/30 px-3 py-2">
              <span className="text-xs text-foreground">You've reached the final page.</span>
              <div className="flex gap-2">
                <Button size="xs" onClick={() => setFinishOpen(true)}>Mark as finished</Button>
                <button
                  type="button"
                  onClick={() => setShowFinishedBanner(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isActive && (
          <>
            <Button size="xs" variant="outline" onClick={() => setFinishOpen(true)}>Finish</Button>
            <Button size="xs" variant="outline" onClick={() => setDnfOpen(true)}>DNF</Button>
            <Button size="xs" variant="outline" onClick={handlePause}>Pause</Button>
            {rt.page_log.length > 1 && (
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setUndoOpen(true)}
              >
                Undo last entry
              </Button>
            )}
          </>
        )}
        {isPaused && (
          <>
            <Button size="xs" variant="outline" onClick={handleResume}>Resume</Button>
            <Button size="xs" variant="outline" onClick={() => setDnfOpen(true)}>DNF</Button>
          </>
        )}
        <Button
          size="xs"
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => setDeleteOpen(true)}
        >
          Delete
        </Button>
      </div>

      {actionError && <p role="alert" className="mt-1.5 text-xs text-destructive">{actionError}</p>}

      {/* DNF inline form */}
      {dnfOpen && (
        <div className="mt-3 rounded-sm border border-rule bg-muted/30 p-3">
          <form onSubmit={handleDnfSubmit} className="flex items-end gap-3 flex-wrap">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Final page</span>
              <input
                type="number"
                value={dnfPage}
                onChange={(e) => setDnfPage(e.target.value)}
                className="mt-0.5 block w-24 rounded-sm border border-rule bg-background px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Date</span>
              <input
                type="date"
                value={dnfDate}
                onChange={(e) => setDnfDate(e.target.value)}
                className="mt-0.5 block w-36 rounded-sm border border-rule bg-background px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <Button type="submit" size="sm" disabled={dnfSaving}>
              {dnfSaving ? "…" : "Mark DNF"}
            </Button>
            <button
              type="button"
              onClick={() => setDnfOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      <FinishModal
        open={finishOpen}
        onOpenChange={setFinishOpen}
        copySlug={copySlug}
        startedDate={startedDate}
        onUpdate={onUpdate}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete read-through"
        message={`Permanently delete this read-through started ${formatDate(rt.started_date)}? All page log entries will be lost.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteReadThrough}
        loading={deleting}
      />

      <ConfirmDialog
        open={undoOpen}
        onOpenChange={setUndoOpen}
        title="Undo last entry"
        message={`Remove the last page log entry (page ${lastPage}, ${formatDate(lastEntry?.date ?? "")})?`}
        confirmLabel="Undo"
        onConfirm={handleUndoLastEntry}
        loading={undoing}
      />
    </div>
  );
}
