import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useEdition } from "@/hooks/useEdition";
import { useCopiesByEdition } from "@/hooks/useCopiesByEdition";
import { CopyCard } from "@/components/CopyCard";
import { NoteTimeline } from "@/components/NoteTimeline";
import { EditEditionModal } from "@/components/EditEditionModal";
import { AddCopyModal } from "@/components/AddCopyModal";
import { Button } from "@/components/ui/button";
import Markdown from "react-markdown";

export default function EditionDetail() {
  const { slug = "" } = useParams();
  const { edition, loading, notFound, refetch } = useEdition(slug);
  const [editOpen, setEditOpen] = useState(false);
  const [addCopyOpen, setAddCopyOpen] = useState(false);

  const editionSlugForCopies = edition?.slug ?? slug;
  const editionWorkForCopy = edition?.work_meta?.slug ?? "";
  const { copies } = useCopiesByEdition(editionSlugForCopies);

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="font-display text-2xl text-foreground">No such edition.</p>
        <p className="mt-2 text-sm text-muted-foreground">This edition may have been removed or never existed.</p>
        <Link to="/" className="mt-6 inline-block text-sm text-primary underline-offset-4 hover:underline">
          Back to the shelf
        </Link>
      </div>
    );
  }

  if (loading || !edition) {
    return <div className="mx-auto max-w-5xl px-6 py-24 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to shelf
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAddCopyOpen(true)}>
            Add Copy
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            Edit Edition
          </Button>
        </div>
      </div>

      <h1 className="font-display text-3xl text-foreground sm:text-4xl">
        {edition.work_meta?.title ?? edition.slug}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {[edition.publisher, edition.publish_date?.slice(0, 4), edition.format]
          .filter(Boolean)
          .join(" · ") || "Edition"}
      </p>

      {edition.work_meta && (
        <p className="mt-1 text-sm">
          <Link to={`/works/${edition.work_meta.slug}`} className="text-primary underline-offset-4 hover:underline">
            ← {edition.work_meta.title}
          </Link>
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
        {edition.isbn && (
          <div>
            <span className="text-xs font-medium text-muted-foreground">ISBN</span>
            <p className="text-sm tabular-nums">{edition.isbn}</p>
          </div>
        )}
        {edition.page_count != null && (
          <div>
            <span className="text-xs font-medium text-muted-foreground">Pages</span>
            <p className="text-sm tabular-nums">{edition.page_count}</p>
          </div>
        )}
        {edition.language && (
          <div>
            <span className="text-xs font-medium text-muted-foreground">Language</span>
            <p className="text-sm uppercase">{edition.language}</p>
          </div>
        )}
        {edition.contributors && edition.contributors.length > 0 && (
          <div className="sm:col-span-2">
            <span className="text-xs font-medium text-muted-foreground">Contributors</span>
            <p className="text-sm">
              {edition.contributors.map((c) => `${c.name}${c.role ? ` (${c.role})` : ""}`).join(", ")}
            </p>
          </div>
        )}
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-semibold text-foreground">
          Copies
          {typeof edition.copy_count === "number" && (
            <span className="ml-1 font-normal text-muted-foreground">({edition.copy_count})</span>
          )}
        </h2>
        {copies.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No copies of this edition yet.</p>
        ) : (
          <div className="mt-3">
            {copies.map((copy) => (
              <Link
                key={copy.slug}
                to={`/copies/${copy.slug}`}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                <CopyCard copy={copy} edition={edition} />
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-12">
        <NoteTimeline entityType="edition" entitySlug={edition.slug} />
      </div>

      {edition.body && (
        <details className="mt-12 group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground select-none">
            Markdown Preview
          </summary>
          <div className="mt-4 border border-rule rounded-sm p-6 prose prose-sm max-w-none dark:prose-invert">
            <Markdown>{edition.body}</Markdown>
          </div>
        </details>
      )}

      <EditEditionModal edition={edition} open={editOpen} onOpenChange={setEditOpen} onSaved={refetch} />
      <AddCopyModal
        editionSlug={edition.slug}
        workSlug={editionWorkForCopy}
        workTitle={edition.work_meta?.title ?? editionWorkForCopy}
        open={addCopyOpen}
        onOpenChange={setAddCopyOpen}
        onSaved={refetch}
      />
    </div>
  );
}
