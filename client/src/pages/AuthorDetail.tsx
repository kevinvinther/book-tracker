import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuthor } from "@/hooks/useAuthor";
import { EditAuthorModal } from "@/components/EditAuthorModal";
import { Skeleton } from "@/components/Skeleton";
import { Button } from "@/components/ui/button";
import { CoverImage } from "@/components/CoverImage";
import Markdown from "react-markdown";

export default function AuthorDetail() {
  const { slug = "" } = useParams();
  const { author, loading, notFound, error, refetch } = useAuthor(slug);
  const [editOpen, setEditOpen] = useState(false);

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="font-display text-2xl text-foreground">No such author.</p>
        <p className="mt-2 text-sm text-muted-foreground">This author may have been removed or never existed.</p>
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

  if (loading || !author) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-8">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-2 h-4 w-40" />
        <div className="mt-8">
          <Skeleton className="h-5 w-16" />
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-[2/3] w-full" />
                <Skeleton className="mt-2.5 h-5 w-3/4" />
                <Skeleton className="mt-1 h-3 w-1/3" />
              </div>
            ))}
          </div>
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
          Edit Author
        </Button>
      </div>

      <h1 className="font-display text-3xl text-foreground sm:text-4xl">{author.name}</h1>
      {author.aliases && author.aliases.length > 0 && (
        <p className="mt-1 text-sm text-muted-foreground">
          Also known as: {author.aliases.join(", ")}
        </p>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-foreground">Works</h2>
        {author.works.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No works yet.</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {author.works.map((work) => (
              <Link
                key={work.slug}
                to={`/works/${work.slug}`}
                className="group block focus-visible:outline-none"
              >
                <div className="overflow-hidden rounded-sm border border-rule bg-card shadow-[0_1px_2px_oklch(0.2_0.02_50_/_0.15)] transition-shadow duration-150 group-hover:shadow-[0_2px_8px_-2px_oklch(0.2_0.02_50_/_0.2)] group-focus-visible:ring-2 group-focus-visible:ring-ring">
                  <CoverImage
                    src={work.primary_cover ? `/api/attachments/${work.primary_cover}` : ""}
                    alt={`Cover of ${work.title}`}
                    variant="card"
                  />
                </div>
                <div className="mt-2.5 px-0.5">
                  <h3 className="font-display text-[1.0625rem] leading-tight text-foreground">{work.title}</h3>
                  {typeof work.copy_count === "number" && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {work.copy_count} {work.copy_count === 1 ? "copy" : "copies"}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {author.body && (
        <details className="mt-12 group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground select-none">
            Markdown Preview
          </summary>
          <div className="mt-4 border border-rule rounded-sm p-6 prose prose-sm max-w-none dark:prose-invert">
            <Markdown>{author.body}</Markdown>
          </div>
        </details>
      )}

      <EditAuthorModal author={author} open={editOpen} onOpenChange={setEditOpen} onSaved={refetch} />
    </div>
  );
}
