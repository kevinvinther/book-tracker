import { useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useCopy } from "@/hooks/useCopy";
import { EditCopyModal } from "@/components/EditCopyModal";
import { ReadThroughList } from "@/components/ReadThroughList";
import { NoteTimeline } from "@/components/NoteTimeline";
import { LoanHistory } from "@/components/LoanHistory";
import { StatusStamp } from "@/components/StatusStamp";
import { Skeleton } from "@/components/Skeleton";
import { CoverImage } from "@/components/CoverImage";
import { Button } from "@/components/ui/button";
import type { ReadThrough } from "@/lib/types";
import Markdown from "react-markdown";

export default function CopyDetail() {
  const { slug = "" } = useParams();
  const { copy, loading, notFound, error, refetch, updateCopy } = useCopy(slug);

  const handleRTUpdate = useCallback((rts?: ReadThrough[]) => {
    if (rts) {
      updateCopy((prev) => ({ ...prev, read_throughs: rts }));
    } else {
      refetch();
    }
  }, [updateCopy, refetch]);
  const [editOpen, setEditOpen] = useState(false);

  if (notFound) {
    return (
      <div aria-live="polite" className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="font-display text-2xl text-foreground">No such copy.</p>
        <p className="mt-2 text-sm text-muted-foreground">This copy may have been removed or never existed.</p>
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

  if (loading || !copy) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid grid-cols-[100px_1fr] gap-4 md:grid-cols-[minmax(200px,280px)_1fr] md:gap-12">
          <Skeleton className="aspect-[2/3] w-full rounded-sm" />
          <div className="space-y-3 md:border-l-2 md:border-stamp/40 md:pl-10">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
        <div className="mt-10 space-y-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-6 w-32" />
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
          Edit Copy
        </Button>
      </div>

      <div className="grid grid-cols-[100px_1fr] gap-4 md:grid-cols-[minmax(200px,280px)_1fr] md:gap-12">
        <div className="md:mr-[-1.5rem]">
          <CoverImage
            src={copy.cover_image ? `/api/attachments/${copy.cover_image}` : ""}
            alt={`Cover of ${copy.work_meta?.title ?? "unknown work"}`}
            variant="detail"
          />
        </div>

        <div className="md:border-t-0 md:border-l-2 md:border-stamp/40 md:pt-0 md:pl-10">
          <h1 className="font-display text-2xl text-foreground md:text-3xl lg:text-4xl">
            {copy.work_meta?.title ?? "Copy"}
          </h1>

          <div className="mt-2 space-y-1 text-sm">
            {copy.work_meta && (
              <p>
                <Link to={`/works/${copy.work_meta.slug}`} className="text-primary underline-offset-4 hover:underline">
                  {copy.work_meta.title}
                </Link>
              </p>
            )}
            {copy.edition_meta && (
              <p className="text-muted-foreground">
                <Link to={`/editions/${copy.edition_meta.slug}`} className="hover:underline underline-offset-4">
                  {[copy.edition_meta.publisher, copy.edition_meta.format].filter(Boolean).join(" · ") || copy.edition_meta.slug}
                </Link>
                {copy.edition_meta.page_count != null && ` · ${copy.edition_meta.page_count} pp`}
              </p>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <StatusStamp status={copy.status} className="text-lg" />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
            {copy.condition && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">Condition</span>
                <p className="text-sm capitalize">{copy.condition}</p>
              </div>
            )}
            {copy.location && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">Location</span>
                <p className="text-sm">{copy.location}</p>
              </div>
            )}
            {copy.acquisition_date && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">Acquired</span>
                <p className="text-sm">{copy.acquisition_date.slice(0, 10)}</p>
              </div>
            )}
            {copy.acquisition_source && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">Source</span>
                <p className="text-sm">{copy.acquisition_source}</p>
              </div>
            )}
            {copy.price_amount != null && (
              <div>
                <span className="text-xs font-medium text-muted-foreground">Price</span>
                <p className="text-sm tabular-nums">
                  {copy.price_currency && `${copy.price_currency} `}
                  {copy.price_amount.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ReadThroughList
          readThroughs={copy.read_throughs}
          copySlug={copy.slug}
          pageCount={copy.edition_meta?.page_count}
          copyStatus={copy.status}
          onUpdate={handleRTUpdate}
        />
        <NoteTimeline
          entityType="copy"
          entitySlug={copy.slug}
          readThroughs={copy.read_throughs}
        />
      </div>

      <LoanHistory
        copySlug={copy.slug}
        loans={copy.loans}
        copyStatus={copy.status}
        onSaved={refetch}
      />

      {copy.body && (
        <details className="mt-12 group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground select-none">
            Markdown Preview
          </summary>
          <div className="mt-4 border border-rule rounded-sm p-6 prose prose-sm max-w-none dark:prose-invert">
            <Markdown>{copy.body}</Markdown>
          </div>
        </details>
      )}

      <EditCopyModal copy={copy} open={editOpen} onOpenChange={setEditOpen} onSaved={refetch} />
    </div>
  );
}
