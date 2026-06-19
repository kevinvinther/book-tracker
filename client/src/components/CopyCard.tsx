import { StatusStamp } from "@/components/StatusStamp";
import type { Copy, Edition, ReadThrough } from "@/lib/types";

function getMostRecentReadThrough(readThroughs: ReadThrough[] | undefined): ReadThrough | null {
  if (!readThroughs || readThroughs.length === 0) return null;
  let mostRecent = readThroughs[0];
  for (const rt of readThroughs) {
    if (rt.started_date > mostRecent.started_date) mostRecent = rt;
  }
  return mostRecent;
}

function formatReadThroughStatus(rt: ReadThrough, pageCount: number | undefined): string {
  const lastEntry = rt.page_log[rt.page_log.length - 1];
  const lastPage = lastEntry?.page ?? 0;
  const pagePart = pageCount != null ? `${lastPage}/${pageCount}` : String(lastPage);

  switch (rt.status) {
    case "reading":
      return `Reading · pg ${pagePart}`;
    case "paused":
      return `Paused · pg ${pagePart}`;
    case "finished":
      return rt.rating != null
        ? `Finished · ★ ${rt.rating.toFixed(1)}`
        : "Finished";
    case "dnf":
      return "DNF";
  }
}

interface CopyCardProps {
  copy: Copy;
  edition: Edition;
}

export function CopyCard({ copy, edition }: CopyCardProps) {
  const leading = edition.format || (!edition.format && edition.publisher) || null;
  const mostRecent = getMostRecentReadThrough(copy.read_throughs);

  return (
    <div className="border-t border-rule px-1 py-3 first:border-t-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {edition.format && <span className="text-foreground capitalize">{edition.format}</span>}
          {!edition.format && edition.publisher && (
            <span className="text-muted-foreground">{edition.publisher}</span>
          )}
          {copy.condition && (
            <span className="text-muted-foreground">
              {leading && <span className="mr-1.5 text-rule">·</span>}
              {copy.condition}
            </span>
          )}
          {copy.location && <span className="text-muted-foreground">— {copy.location}</span>}
          {!leading && !copy.condition && !copy.location && !mostRecent && (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
        <StatusStamp status={copy.status} />
      </div>
      {mostRecent && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {formatReadThroughStatus(mostRecent, edition.page_count)}
        </p>
      )}
      {(copy.acquisition_source || copy.acquisition_date) && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {[copy.acquisition_source, copy.acquisition_date].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );
}
