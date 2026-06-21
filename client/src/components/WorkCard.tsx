import { Link } from "react-router-dom";
import type { Work } from "@/lib/types";
import { Tooltip } from "@/components/Tooltip";
import { CoverImage } from "@/components/CoverImage";

interface WorkCardProps {
  work: Work;
  revealIndex: number;
}

export function WorkCard({ work, revealIndex }: WorkCardProps) {
  const firstAuthor = work.authors_meta?.[0];

  return (
    <Link
      to={`/works/${work.slug}`}
      className="card-reveal group block focus-visible:outline-none"
      style={{ "--reveal-index": Math.min(revealIndex, 16) } as React.CSSProperties}
    >
      <div className="overflow-hidden rounded-sm border border-rule bg-card shadow-[0_1px_2px_oklch(0.2_0.02_50_/_0.15)] transition-shadow duration-150 group-hover:shadow-[0_2px_8px_-2px_oklch(0.2_0.02_50_/_0.2)] group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <CoverImage
          src={work.primary_cover ? `/api/attachments/${work.primary_cover}` : ""}
          alt={`Cover of ${work.title}`}
          variant="card"
        />
      </div>
      <div className="mt-2.5 px-0.5">
        <h3 className="font-display text-[1.0625rem] leading-tight text-foreground">
          {work.title}
        </h3>
        {firstAuthor ? (
          <Tooltip content={firstAuthor.name}>
            <p className="mt-0.5 truncate text-[0.8125rem] text-muted-foreground">{firstAuthor.name}</p>
          </Tooltip>
        ) : (
          <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">Unknown author</p>
        )}
        {typeof work.copy_count === "number" && (
          <p className="mt-1 text-xs text-muted-foreground">
            {work.copy_count} {work.copy_count === 1 ? "copy" : "copies"}
          </p>
        )}
      </div>
    </Link>
  );
}
