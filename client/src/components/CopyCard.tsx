import { StatusStamp } from "@/components/StatusStamp";
import type { Copy, Edition } from "@/lib/types";

interface CopyCardProps {
  copy: Copy;
  edition: Edition;
}

export function CopyCard({ copy, edition }: CopyCardProps) {
  return (
    <div className="border-t border-rule px-1 py-3 first:border-t-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {edition.format && <span className="text-foreground capitalize">{edition.format}</span>}
          {copy.condition && (
            <span className="text-muted-foreground">
              {edition.format && <span className="mx-1.5 text-rule">·</span>}
              {copy.condition}
            </span>
          )}
          {copy.location && <span className="text-muted-foreground">— {copy.location}</span>}
        </div>
        <StatusStamp status={copy.status} />
      </div>
      {copy.acquisition_source && (
        <p className="mt-1.5 text-xs text-muted-foreground">{copy.acquisition_source}</p>
      )}
    </div>
  );
}
