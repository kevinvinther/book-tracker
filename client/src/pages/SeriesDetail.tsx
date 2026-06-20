import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSeries } from "@/hooks/useSeries";
import { EditSeriesModal } from "@/components/EditSeriesModal";
import { Skeleton } from "@/components/Skeleton";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/Tooltip";
import { CoverImage } from "@/components/CoverImage";
import Markdown from "react-markdown";

export default function SeriesDetail() {
  const { slug = "" } = useParams();
  const { series, loading, notFound, error, refetch } = useSeries(slug);
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

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p role="alert" className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={refetch} className="mt-4">Retry</Button>
      </div>
    );
  }

  if (loading || !series) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <Skeleton className="h-9 w-64" />
        <div className="mt-8 space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4">
              <Skeleton className="h-16 w-10 shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
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

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-foreground mb-1">Works</h2>
        <div className="space-y-1">
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
                <CoverImage
                  src={work.primary_cover ? `/api/attachments/${work.primary_cover}` : ""}
                  alt={`Cover of ${work.title}`}
                  variant="mini"
                />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-display text-base leading-snug text-foreground">{work.title}</h3>
                {firstAuthor ? (
                  <Tooltip content={firstAuthor.name}>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{firstAuthor.name}</p>
                  </Tooltip>
                ) : (
                  <p className="mt-0.5 text-xs text-muted-foreground">Unknown author</p>
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
      </div>

      {series.body && (
        <details className="mt-12 group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground select-none">
            Markdown Preview
          </summary>
          <div className="mt-4 border border-rule rounded-sm p-6 prose prose-sm max-w-none dark:prose-invert">
            <Markdown>{series.body}</Markdown>
          </div>
        </details>
      )}

      <EditSeriesModal series={series} open={editOpen} onOpenChange={setEditOpen} onSaved={refetch} />
    </div>
  );
}
