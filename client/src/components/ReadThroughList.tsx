import { ReadThroughSection } from "@/components/ReadThroughSection";
import { StartReadThroughForm } from "@/components/StartReadThroughForm";
import type { ReadThrough } from "@/lib/types";

interface ReadThroughListProps {
  readThroughs: ReadThrough[] | undefined;
  copySlug: string;
  pageCount: number | undefined;
  copyStatus: string;
  onUpdate: (rts?: ReadThrough[]) => void;
}

export function ReadThroughList({ readThroughs, copySlug, pageCount, copyStatus, onUpdate }: ReadThroughListProps) {
  const sorted = readThroughs
    ? [...readThroughs].sort((a, b) => b.started_date.localeCompare(a.started_date))
    : [];

  return (
    <section>
      <h2 className="text-sm font-semibold text-foreground">Read-through History</h2>

      <div className="mt-3">
        <StartReadThroughForm
          copySlug={copySlug}
          isLent={copyStatus === "lent"}
          onUpdate={onUpdate}
        />
      </div>

      {sorted.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No read-throughs yet.</p>
      ) : (
        <div className="mt-2 space-y-1">
          {sorted.map((rt, i) => (
            <ReadThroughSection
              key={`${rt.started_date}-${i}`}
              rt={rt}
              copySlug={copySlug}
              pageCount={pageCount}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </section>
  );
}
