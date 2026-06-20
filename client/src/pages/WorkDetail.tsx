import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useWork } from "@/hooks/useWork";
import { useEditionsByWork } from "@/hooks/useEditionsByWork";
import { useCopiesByWork } from "@/hooks/useCopiesByWork";
import { CopyCard } from "@/components/CopyCard";
import { NoteTimeline } from "@/components/NoteTimeline";
import { EditWorkModal } from "@/components/EditWorkModal";
import { Skeleton } from "@/components/Skeleton";
import { CoverImage } from "@/components/CoverImage";
import { Button } from "@/components/ui/button";
import Markdown from "react-markdown";

export default function WorkDetail() {
  const { slug = "" } = useParams();
  const { work, loading, notFound, error, refetch } = useWork(slug);
  const { editions } = useEditionsByWork(slug);
  const { copies } = useCopiesByWork(slug);
  const [editOpen, setEditOpen] = useState(false);

  if (notFound) {
    return (
      <div aria-live="polite" className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="font-display text-2xl text-foreground">No such book.</p>
        <p className="mt-2 text-sm text-muted-foreground">It may have been removed or never existed.</p>
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

  if (loading || !work) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid grid-cols-[100px_1fr] gap-4 md:grid-cols-[minmax(200px,280px)_1fr] md:gap-12">
          <Skeleton className="aspect-[2/3] w-full rounded-sm" />
          <div className="space-y-3 md:border-l-2 md:border-stamp/40 md:pl-10">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-14" />
            </div>
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
        <div className="mt-12 space-y-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to shelf
        </Link>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          Edit Work
        </Button>
      </div>

      <div className="grid grid-cols-[100px_1fr] gap-4 md:grid-cols-[minmax(200px,280px)_1fr] md:gap-12">
        <div className="md:mr-[-1.5rem]">
          <CoverImage
            src={work.primary_cover ? `/api/attachments/${work.primary_cover}` : ""}
            alt={`Cover of ${work.title}`}
            variant="detail"
          />
        </div>

        <div className="md:border-t-0 md:border-l-2 md:border-stamp/40 md:pt-0 md:pl-10">
          <h1 className="font-display text-2xl text-foreground md:text-3xl lg:text-4xl">{work.title}</h1>
          {work.subtitle && <p className="mt-1 text-lg text-muted-foreground">{work.subtitle}</p>}

          {work.authors_meta && work.authors_meta.length > 0 ? (
            <p className="mt-3 text-sm">
              {work.authors_meta.map((a, i) => (
                <span key={a.slug}>
                  {i > 0 && ", "}
                  <Link to={`/authors/${a.slug}`} className="text-primary underline-offset-4 hover:underline">
                    {a.name}
                  </Link>
                </span>
              ))}
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Unknown author</p>
          )}

          {work.series_meta && (
            <p className="mt-2 text-sm text-muted-foreground">
              Series:{" "}
              <Link to={`/series/${work.series_meta.slug}`} className="text-primary underline-offset-4 hover:underline">
                {work.series_meta.name}
              </Link>
              {work.series_position != null && ` #${work.series_position}`}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {work.original_language && <span>{work.original_language.toUpperCase()}</span>}
            {work.genres?.map((g) => (
              <span key={g} className="rounded-sm bg-secondary px-2 py-0.5">
                {g}
              </span>
            ))}
          </div>

          {work.description && <p className="mt-4 text-sm leading-relaxed text-foreground/90">{work.description}</p>}
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-sm font-semibold text-foreground">Editions</h2>
        <div className="mt-3 space-y-8">
          {editions.length === 0 && <p className="text-sm text-muted-foreground">No editions yet.</p>}
          {editions.map((edition) => {
            const editionCopies = copies.filter((c) => c.edition === `[[editions/${edition.slug}]]`);
            return (
              <div key={edition.slug} className="border-t border-rule pt-4">
                <Link
                  to={`/editions/${edition.slug}`}
                  className="block text-sm font-medium text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  {[edition.publisher, edition.publish_date?.slice(0, 4), edition.format]
                    .filter(Boolean)
                    .join(" · ") || edition.slug}
                </Link>
                <div className="mt-1">
                  {editionCopies.length === 0 ? (
                    <p className="py-3 text-sm text-muted-foreground">No copies of this edition yet.</p>
                  ) : (
                    editionCopies.map((copy) => (
                      <Link
                        key={copy.slug}
                        to={`/copies/${copy.slug}`}
                        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                      >
                        <CopyCard copy={copy} edition={edition} />
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-12">
        <NoteTimeline entityType="work" entitySlug={work.slug} />
      </div>

      {work.body && (
        <details className="mt-12 group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground select-none">
            Markdown Preview
          </summary>
          <div className="mt-4 border border-rule rounded-sm p-6 prose prose-sm max-w-none dark:prose-invert">
            <Markdown>{work.body}</Markdown>
          </div>
        </details>
      )}

      <EditWorkModal work={work} open={editOpen} onOpenChange={setEditOpen} onSaved={refetch} />
    </div>
  );
}
