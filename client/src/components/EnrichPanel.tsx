import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SourceLookupResult } from "@/lib/types";

const SOURCES = [
  { id: "google", label: "Google Books" },
  { id: "openlibrary", label: "Open Library" },
] as const;

const SOURCE_LABELS: Record<string, string> = {
  google: "Google Books",
  openlibrary: "Open Library",
};

function sourceLabel(id: string): string {
  return SOURCE_LABELS[id] ?? id;
}

export type EnrichField =
  | "title"
  | "subtitle"
  | "authors"
  | "publisher"
  | "publish_date"
  | "page_count"
  | "format"
  | "language"
  | "genres"
  | "description";

const FIELDS: { key: EnrichField; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "subtitle", label: "Subtitle" },
  { key: "authors", label: "Authors" },
  { key: "publisher", label: "Publisher" },
  { key: "publish_date", label: "Publish date" },
  { key: "page_count", label: "Pages" },
  { key: "format", label: "Format" },
  { key: "language", label: "Language" },
  { key: "genres", label: "Genres" },
  { key: "description", label: "Description" },
];

function displayValue(result: SourceLookupResult, field: EnrichField): string | null {
  const v = result[field as keyof SourceLookupResult];
  if (v === undefined || v === null) return null;
  if (Array.isArray(v)) return v.length > 0 ? v.join(", ") : null;
  const s = String(v);
  return s.trim() === "" ? null : s;
}

interface EnrichPanelProps {
  isbn: string;
  current: Record<EnrichField, string>;
  onAdopt: (field: EnrichField, value: unknown) => void;
  onAdoptCover: (coverUrl: string) => void;
}

export function EnrichPanel({ isbn, current, onAdopt, onAdoptCover }: EnrichPanelProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>({ google: true, openlibrary: true });
  const [skipCache, setSkipCache] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<SourceLookupResult[]>([]);

  const hasIsbn = isbn.trim() !== "";
  const chosenSources = SOURCES.filter((s) => selected[s.id]).map((s) => s.id);

  function handleFetch() {
    if (!hasIsbn || chosenSources.length === 0) return;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ isbn: isbn.trim(), sources: chosenSources.join(",") });
    if (skipCache) params.set("nocache", "1");

    fetch(`/api/lookup/all?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Lookup failed (${res.status})`);
        return res.json();
      })
      .then((data: { results: SourceLookupResult[] }) => {
        setResults(data.results ?? []);
        setFetched(true);
      })
      .catch((e) => setError(e.message || "Lookup failed"))
      .finally(() => setLoading(false));
  }

  return (
    <section className="rounded-sm border border-rule bg-muted/30 p-4">
      <h2 className="text-sm font-semibold text-foreground">Enrich from sources</h2>

      {!hasIsbn ? (
        <p className="mt-2 text-xs text-muted-foreground">Add an ISBN to fetch metadata from external sources.</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {SOURCES.map((s) => (
              <label key={s.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={!!selected[s.id]}
                  onChange={(e) => setSelected((prev) => ({ ...prev, [s.id]: e.target.checked }))}
                  className="size-3 accent-primary"
                />
                {s.label}
              </label>
            ))}
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={skipCache}
                onChange={(e) => setSkipCache(e.target.checked)}
                className="size-3 accent-primary"
              />
              Skip cache
            </label>
            <Button type="button" variant="outline" size="sm" onClick={handleFetch} disabled={loading || chosenSources.length === 0}>
              {loading ? "Fetching…" : "Fetch metadata"}
            </Button>
          </div>

          {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}

          {fetched && results.length === 0 && !loading && (
            <p className="mt-3 text-xs text-muted-foreground">No results from the selected sources.</p>
          )}

          {results.length > 0 && (
            <div className="mt-4 space-y-4">
              {FIELDS.map((f) => {
                const offers = results
                  .map((r) => ({ source: r.source, raw: r[f.key as keyof SourceLookupResult], text: displayValue(r, f.key) }))
                  .filter((o) => o.text !== null);
                if (offers.length === 0) return null;
                const cur = current[f.key]?.trim() ?? "";
                return (
                  <div key={f.key} className="border-t border-rule pt-3 first:border-t-0 first:pt-0">
                    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{f.label}</span>

                    <div className="mt-1.5 flex items-start gap-3">
                      <span className="w-14 shrink-0" aria-hidden="true" />
                      <span className="w-28 shrink-0 pt-1 text-xs font-medium text-foreground">Current</span>
                      <span className="min-w-0 flex-1 pt-1 text-sm text-foreground">{cur || "—"}</span>
                    </div>

                    <div className="mt-1 space-y-1">
                      {offers.map((o) => {
                        const same = cur !== "" && o.text === cur;
                        return (
                          <div key={o.source} className="flex items-start gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 w-14 shrink-0 justify-center"
                              onClick={() => onAdopt(f.key, o.raw)}
                            >
                              Use
                            </Button>
                            <span className="w-28 shrink-0 pt-1 text-xs text-muted-foreground">{sourceLabel(o.source)}</span>
                            <span className={cn("min-w-0 flex-1 pt-1 text-sm", same ? "text-muted-foreground" : "text-foreground")}>
                              {o.text}
                              {same && <span className="ml-2 text-xs text-muted-foreground">· same as current</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {results.some((r) => r.cover_url) && (
                <div className="border-t border-rule pt-3">
                  <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Cover</span>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {results
                      .filter((r) => r.cover_url)
                      .map((r) => (
                        <button
                          key={r.source}
                          type="button"
                          onClick={() => onAdoptCover(r.cover_url!)}
                          className="group flex flex-col items-center gap-1 focus:outline-none"
                          title={`Use ${sourceLabel(r.source)} cover`}
                        >
                          <img
                            src={r.cover_url}
                            alt={`${sourceLabel(r.source)} cover`}
                            className="h-28 rounded-sm border border-rule object-cover group-hover:ring-2 group-hover:ring-ring"
                            loading="lazy"
                          />
                          <span className="text-xs text-muted-foreground">{sourceLabel(r.source)}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
