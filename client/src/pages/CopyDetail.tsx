import { useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useCopy } from "@/hooks/useCopy";
import { EditCopyModal } from "@/components/EditCopyModal";
import { ReadThroughList } from "@/components/ReadThroughList";
import { NoteTimeline } from "@/components/NoteTimeline";
import { StatusStamp } from "@/components/StatusStamp";
import { Button } from "@/components/ui/button";
import type { ReadThrough } from "@/lib/types";

export default function CopyDetail() {
  const { slug = "" } = useParams();
  const { copy, loading, notFound, refetch, updateCopy } = useCopy(slug);

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
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="font-display text-2xl text-foreground">No such copy.</p>
        <p className="mt-2 text-sm text-muted-foreground">This copy may have been removed or never existed.</p>
        <Link to="/" className="mt-6 inline-block text-sm text-primary underline-offset-4 hover:underline">
          Back to the shelf
        </Link>
      </div>
    );
  }

  if (loading || !copy) {
    return <div className="mx-auto max-w-5xl px-6 py-24 text-center text-sm text-muted-foreground">Loading…</div>;
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

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(200px,280px)_1fr] md:gap-12">
        <div className="md:mr-[-1.5rem]">
          {copy.cover_image ? (
            <img
              src={`/api/attachments/${copy.cover_image}`}
              alt="Copy cover"
              className="w-full rounded-sm border border-rule shadow-[0_20px_40px_-16px_oklch(0.2_0.02_50_/_0.45)]"
            />
          ) : (
            <div className="flex aspect-[2/3] w-full items-center justify-center rounded-sm border border-rule bg-muted">
              <span className="text-xs text-muted-foreground">No cover</span>
            </div>
          )}
        </div>

        <div className="border-t border-stamp/40 pt-6 md:border-t-0 md:border-l-2 md:border-stamp/40 md:pt-0 md:pl-10">
          <h1 className="font-display text-3xl text-foreground sm:text-4xl">
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

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-foreground">Loan History</h2>
        <p className="mt-2 text-sm text-muted-foreground">No loans yet.</p>
      </section>

      <EditCopyModal copy={copy} open={editOpen} onOpenChange={setEditOpen} onSaved={refetch} />
    </div>
  );
}
