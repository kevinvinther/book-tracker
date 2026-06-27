import { useEffect, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
import { Skeleton } from "@/components/Skeleton";
import type { Work } from "@/lib/types";

interface MergeWorksModalProps {
  winnerSlug: string;
  winnerTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMerged: () => void;
}

interface WorkSearchResult {
  slug: string;
  title: string;
  authors_meta?: { slug: string; name: string }[];
}

interface PreviewData {
  editionsCount: number;
  copiesCount: number;
  notesCount: number;
  genresToAdd: string[];
  aliasesToAdd: string[];
  scalarsToAdopt: { field: string; label: string }[];
}

const SCALAR_LABELS: { field: keyof Work; label: string }[] = [
  { field: "subtitle", label: "Subtitle" },
  { field: "description", label: "Description" },
  { field: "primary_cover", label: "Cover image" },
  { field: "series", label: "Series" },
  { field: "series_position", label: "Series position" },
  { field: "original_language", label: "Original language" },
  { field: "original_publish_year", label: "Original publish year" },
];

function isSet(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function genreKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

export function MergeWorksModal({
  winnerSlug,
  winnerTitle,
  open,
  onOpenChange,
  onMerged,
}: MergeWorksModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<WorkSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loserSlug, setLoserSlug] = useState<string | null>(null);
  const [loserTitle, setLoserTitle] = useState<string>("");

  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSearchResults([]);
      setLoserSlug(null);
      setLoserTitle("");
      setPreview(null);
      setPreviewError(null);
      setSubmitError(null);
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/works?q=${encodeURIComponent(searchQuery)}`)
        .then((r) => {
          if (!r.ok) throw new Error(`search failed: ${r.status}`);
          return r.json() as Promise<WorkSearchResult[]>;
        })
        .then((results) => {
          setSearchResults(results.filter((w) => w.slug !== winnerSlug));
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, winnerSlug]);

  function selectLoser(slug: string, title: string) {
    setLoserSlug(slug);
    setLoserTitle(title);
    setPreview(null);
    setPreviewError(null);
    setSubmitError(null);
    void loadPreview(slug);
  }

  function loadPreview(slug: string) {
    setPreviewLoading(true);
    setPreviewError(null);

    Promise.all([
      fetch(`/api/works/${winnerSlug}`).then((r) => r.json() as Promise<Work>),
      fetch(`/api/works/${slug}`).then((r) => r.json() as Promise<Work>),
      fetch(`/api/editions?work=${slug}`).then((r) => r.json() as Promise<unknown[]>),
      fetch(`/api/copies?work=${slug}`).then((r) => r.json() as Promise<unknown[]>),
      fetch(`/api/notes?work=${slug}`).then((r) => r.json() as Promise<unknown[]>),
    ])
      .then(([winner, loser, editions, copies, notes]) => {
        const winnerGenres = new Set((winner.genres ?? []).map(genreKey));
        const loserGenres = (loser.genres ?? []).map(genreKey);
        const genresToAdd = loserGenres.filter((g) => !winnerGenres.has(g));

        const winnerAliases = new Set(winner.aliases ?? []);
        const candidateAliases = [...(loser.aliases ?? []), loser.title];
        const aliasesToAdd = candidateAliases.filter((a) => !winnerAliases.has(a));

        const scalarsToAdopt: { field: string; label: string }[] = [];
        for (const { field, label } of SCALAR_LABELS) {
          if (!isSet(winner[field as keyof Work]) && isSet(loser[field as keyof Work])) {
            scalarsToAdopt.push({ field: field as string, label });
          }
        }

        setPreview({
          editionsCount: editions.length,
          copiesCount: copies.length,
          notesCount: notes.length,
          genresToAdd,
          aliasesToAdd,
          scalarsToAdopt,
        });
      })
      .catch((err) => {
        setPreviewError(err instanceof Error ? err.message : "Failed to load preview");
      })
      .finally(() => setPreviewLoading(false));
  }

  function handleConfirm() {
    if (!loserSlug) return;
    setSubmitting(true);
    setSubmitError(null);

    fetch("/api/works/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winner: winnerSlug, loser: loserSlug }),
    })
      .then((r) => {
        if (!r.ok) {
          return r.json().then(
            (body: { error?: string }) => { throw new Error(body.error ?? `merge failed: ${r.status}`); },
            () => { throw new Error(`merge failed: ${r.status}`); },
          );
        }
        onMerged();
        onOpenChange(false);
      })
      .catch((err) => {
        setSubmitError(err instanceof Error ? err.message : "Failed to merge works");
      })
      .finally(() => setSubmitting(false));
  }

  const canConfirm = !!loserSlug && !!preview && !previewLoading && !previewError && !submitting;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange} title="Merge Works" className="md:w-[min(32rem,90vw)]">
      <div className="mt-3 space-y-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Winner</p>
          <p className="mt-1 text-sm font-medium text-foreground">{winnerTitle}</p>
          <p className="text-xs text-muted-foreground">{winnerSlug}</p>
        </div>

        {!loserSlug && (
          <div>
            <label className="block">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Find the work to merge in
              </span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, author, genre…"
                className="mt-1 block w-full rounded-sm border border-rule bg-background px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            {searching && <p className="mt-2 text-xs text-muted-foreground">Searching…</p>}
            {!searching && searchResults.length > 0 && (
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                {searchResults.map((w) => (
                  <li key={w.slug}>
                    <button
                      type="button"
                      onClick={() => selectLoser(w.slug, w.title)}
                      className="block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="font-medium text-foreground">{w.title}</span>
                      {w.authors_meta && w.authors_meta.length > 0 && (
                        <span className="text-muted-foreground"> — {w.authors_meta.map((a) => a.name).join(", ")}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!searching && searchQuery.trim() && searchResults.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">No matches.</p>
            )}
          </div>
        )}

        {loserSlug && (
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Loser (will be deleted)</p>
                <p className="mt-1 text-sm font-medium text-foreground">{loserTitle}</p>
                <p className="text-xs text-muted-foreground">{loserSlug}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setLoserSlug(null); setLoserTitle(""); setPreview(null); }}
              >
                Change
              </Button>
            </div>
          </div>
        )}

        {loserSlug && previewLoading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}

        {loserSlug && previewError && (
          <div className="space-y-2 rounded-sm border border-destructive/40 bg-destructive/5 p-3">
            <p role="alert" className="text-sm text-destructive">{previewError}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => loserSlug && loadPreview(loserSlug)}>
              Retry preview
            </Button>
          </div>
        )}

        {loserSlug && preview && !previewLoading && !previewError && (
          <div className="space-y-3 rounded-sm border border-rule bg-muted/40 p-3">
            <p className="text-sm font-medium text-foreground">
              {preview.editionsCount} edition{preview.editionsCount === 1 ? "" : "s"},{" "}
              {preview.copiesCount} cop{preview.copiesCount === 1 ? "y" : "ies"},{" "}
              {preview.notesCount} note{preview.notesCount === 1 ? "" : "s"} will move to {winnerTitle}
            </p>

            {preview.genresToAdd.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Genres to add</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {preview.genresToAdd.map((g) => (
                    <span key={g} className="rounded-sm bg-secondary px-2 py-0.5 text-xs">{g}</span>
                  ))}
                </div>
              </div>
            )}

            {preview.aliasesToAdd.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Aliases to add</p>
                <ul className="mt-1 space-y-0.5">
                  {preview.aliasesToAdd.map((a) => (
                    <li key={a} className="text-sm text-foreground">{a}</li>
                  ))}
                </ul>
              </div>
            )}

            {preview.scalarsToAdopt.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Adopted from loser</p>
                <ul className="mt-1 space-y-0.5">
                  {preview.scalarsToAdopt.map((s) => (
                    <li key={s.field} className="text-sm text-foreground">{s.label}</li>
                  ))}
                </ul>
              </div>
            )}

            {preview.genresToAdd.length === 0 &&
              preview.aliasesToAdd.length === 0 &&
              preview.scalarsToAdopt.length === 0 && (
                <p className="text-xs text-muted-foreground">No metadata will change on {winnerTitle}.</p>
              )}
          </div>
        )}

        {submitError && (
          <p role="alert" className="text-sm text-destructive">{submitError}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Dialog.Close render={<Button type="button" variant="outline" />}>Cancel</Dialog.Close>
          <Button type="button" onClick={handleConfirm} disabled={!canConfirm}>
            {submitting ? "Merging…" : "Confirm Merge"}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
