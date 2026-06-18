import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useWorks } from "@/hooks/useWorks";
import { WorkCard } from "@/components/WorkCard";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "created_at", label: "Date added" },
  { value: "title", label: "Title" },
  { value: "author", label: "Author" },
] as const;

export default function WorkGrid() {
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const sort = (searchParams.get("sort") as "title" | "author" | "created_at") || "created_at";
  const genre = searchParams.get("genre") ?? "";

  const [searchInput, setSearchInput] = useState(q);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (searchInput) next.set("q", searchInput);
        else next.delete("q");
        return next;
      });
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const { works, loading, error } = useWorks({ q, sort, order: sort === "created_at" ? "desc" : "asc" });

  const genres = useMemo(() => {
    const set = new Set<string>();
    for (const work of works) {
      for (const g of work.genres ?? []) set.add(g);
    }
    return Array.from(set).sort();
  }, [works]);

  const visibleWorks = genre ? works.filter((w) => w.genres?.includes(genre)) : works;

  function setSort(next: string) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set("sort", next);
      return params;
    });
  }

  function setGenre(next: string) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next) params.set("genre", next);
      else params.delete("genre");
      return params;
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center rounded-sm border border-rule bg-card px-3 py-1.5">
          <span className="mr-2 text-xs text-muted-foreground">Search</span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Title, author, or genre…"
            className="w-48 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none sm:w-64"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-sm border border-rule bg-card px-2 py-1 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <Link
            to="/add"
            className="rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            + Add Manually
          </Link>
        </div>
      </div>

      {genres.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-1.5">
          <button
            onClick={() => setGenre("")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              !genre ? "bg-stamp text-stamp-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted",
            )}
          >
            All
          </button>
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setGenre(g === genre ? "" : g)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                genre === g ? "bg-stamp text-stamp-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted",
              )}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && visibleWorks.length === 0 && !q && !genre && (
        <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-rule py-24 text-center">
          <p className="font-display text-xl text-foreground">No books yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">Add your first book to start your shelf.</p>
        </div>
      )}

      {!loading && visibleWorks.length === 0 && (q || genre) && (
        <p className="py-16 text-center text-sm text-muted-foreground">No works match your search.</p>
      )}

      <div className="grid grid-cols-2 items-start gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {visibleWorks.map((work, index) => (
          <WorkCard key={work.slug} work={work} revealIndex={index} />
        ))}
      </div>
    </div>
  );
}
