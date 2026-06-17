import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSeries } from "@/hooks/useSeries";
import { EditSeriesModal } from "@/components/EditSeriesModal";
import { Button } from "@/components/ui/button";

export default function SeriesDetail() {
  const { slug = "" } = useParams();
  const { series, loading, notFound, refetch } = useSeries(slug);
  const [editOpen, setEditOpen] = useState(false);

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="font-display text-2xl text-foreground">No such series.</p>
        <p className="mt-2 text-sm text-muted-foreground">This series may have been removed or never existed.</p>
        <Link to="/" className="mt-6 inline-block text-sm text-primary underline-offset-4 hover:underline">
          Back to the shelf
        </Link>
      </div>
    );
  }

  if (loading || !series) {
    return <div className="mx-auto max-w-5xl px-6 py-24 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const placeholderCount = series.total_works ? Math.max(0, series.total_works - series.works.length) : 0;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to shelf
        </Link>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          Edit Series
        </Button>
      </div>

      <h1 className="font-display text-3xl text-foreground sm:text-4xl">{series.name}</h1>
      {series.total_works != null && (
        <p className="mt-1 text-sm text-muted-foreground">
          {series.works.length} of {series.total_works} works in library
        </p>
      )}

      <div className="mt-8 space-y-1">
        {series.works.length === 0 && placeholderCount === 0 && (
          <p className="text-sm text-muted-foreground">No works in this series yet.</p>
        )}

        {series.works.map((work) => {
          const firstAuthor = work.authors_meta?.[0];
          return (
            <Link
              key={work.slug}
              to={`/works/${work.slug}`}
              className="group flex items-center gap-4 rounded-sm px-3 py-2.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="w-8 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                {work.series_position != null ? `#${work.series_position}` : "—"}
              </span>

              <div className="h-16 w-10 shrink-0 overflow-hidden rounded-xs border border-rule bg-card">
                {work.primary_cover ? (
                  <img
                    src={`/api/attachments/${work.primary_cover}`}
                    alt={`Cover of ${work.title}`}
                    className="block h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <span className="text-[0.625rem] text-muted-foreground">—</span>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-display text-base leading-snug text-foreground">{work.title}</h3>
                {firstAuthor && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{firstAuthor.name}</p>
                )}
              </div>

              {typeof work.copy_count === "number" && (
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {work.copy_count} {work.copy_count === 1 ? "copy" : "copies"}
                </span>
              )}
            </Link>
          );
        })}

        {placeholderCount > 0 &&
          Array.from({ length: placeholderCount }).map((_, i) => (
            <div
              key={`placeholder-${i}`}
              className="flex items-center gap-4 rounded-sm px-3 py-2.5"
            >
              <span className="w-8 shrink-0 text-right text-sm tabular-nums text-muted-foreground/50">
                #{series.works.length + i + 1}
              </span>
              <div className="h-16 w-10 shrink-0 rounded-xs border border-rule/30 bg-muted/30" />
              <div className="flex-1">
                <span className="text-sm text-muted-foreground/40 italic">Upcoming</span>
              </div>
            </div>
          ))}
      </div>

      <EditSeriesModal series={series} open={editOpen} onOpenChange={setEditOpen} onSaved={refetch} />
    </div>
  );
}
