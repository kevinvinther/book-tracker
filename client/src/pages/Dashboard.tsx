import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, StickyNote, PencilLine } from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import { CoverImage } from "@/components/CoverImage";
import { LogPageForm } from "@/components/LogPageForm";
import { FinishModal } from "@/components/FinishModal";
import { NoteEditorModal } from "@/components/NoteEditorModal";
import { Skeleton } from "@/components/Skeleton";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tooltip } from "@/components/Tooltip";
import { toDatePart, formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type {
  CurrentlyReadingEntry,
  RecentlyFinishedEntry,
  RecentlyAddedEntry,
  DashboardGlance,
  ReadThrough,
} from "@/lib/types";

function coverSrc(cover: string | null): string {
  return cover ? `/api/attachments/${cover}` : "";
}

function CurrentlyReadingCard({
  entry,
  revealIndex,
  onChanged,
}: {
  entry: CurrentlyReadingEntry;
  revealIndex: number;
  onChanged: () => void;
}) {
  const [logOpen, setLogOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);

  const startedDate = toDatePart(entry.started_date);
  const isPaused = entry.status === "paused";
  const title = entry.work?.title ?? "Untitled";
  const author = entry.work?.author ?? "Unknown author";
  const hasPageCount = entry.page_count != null && entry.page_count > 0;
  const percent = hasPageCount
    ? Math.min(100, Math.round((entry.last_page / (entry.page_count as number)) * 100))
    : 0;

  // The note editor wants the copy's read-throughs to prefill the active one.
  const readThroughs: ReadThrough[] = [
    { started_date: entry.started_date, status: entry.status, page_log: entry.page_log },
  ];

  return (
    <article
      className={cn(
        "card-reveal flex items-start gap-4 rounded-sm border border-rule bg-card p-4 shadow-[0_1px_2px_oklch(0.2_0.02_50_/_0.15)]",
        isPaused && "opacity-60",
      )}
      style={{ "--reveal-index": Math.min(revealIndex, 16) } as React.CSSProperties}
    >
      <Link
        to={`/copies/${entry.copy_slug}`}
        className="block w-20 shrink-0 overflow-hidden rounded-sm border border-rule focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CoverImage src={coverSrc(entry.cover)} alt={`Cover of ${title}`} variant="card" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/copies/${entry.copy_slug}`} className="min-w-0 group">
            <h3 className="font-display text-lg leading-tight text-foreground group-hover:text-primary">
              {title}
            </h3>
            <Tooltip content={author}>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{author}</p>
            </Tooltip>
          </Link>
          {isPaused && (
            <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[0.6875rem] font-medium uppercase tracking-wide text-secondary-foreground">
              Paused
            </span>
          )}
        </div>

        <div className="mt-2">
          {hasPageCount ? (
            <>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                {entry.last_page} / {entry.page_count} · {percent}%
              </p>
            </>
          ) : (
            <p className="text-xs tabular-nums text-muted-foreground">p. {entry.last_page}</p>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          <Button size="xs" variant="outline" onClick={() => setLogOpen((v) => !v)} aria-pressed={logOpen}>
            <BookOpen aria-hidden="true" /> Log page
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setNoteOpen(true)}>
            <StickyNote aria-hidden="true" /> Note
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setFinishOpen(true)}>
            <PencilLine aria-hidden="true" /> Finish
          </Button>
        </div>

        {logOpen && (
          <LogPageForm
            copySlug={entry.copy_slug}
            startedDate={startedDate}
            lastPage={entry.last_page}
            pageCount={entry.page_count ?? undefined}
            onUpdate={onChanged}
            onFinished={() => setFinishOpen(true)}
          />
        )}
      </div>

      <NoteEditorModal
        open={noteOpen}
        onOpenChange={setNoteOpen}
        entityType="copy"
        entitySlug={entry.copy_slug}
        readThroughs={readThroughs}
        onSaved={() => {
          setNoteOpen(false);
          onChanged();
        }}
      />
      <FinishModal
        open={finishOpen}
        onOpenChange={setFinishOpen}
        copySlug={entry.copy_slug}
        startedDate={startedDate}
        onUpdate={onChanged}
      />
    </article>
  );
}

function GlanceStrip({ glance }: { glance: DashboardGlance }) {
  const items = [
    { value: glance.finished_this_year, label: "Finished this year" },
    { value: glance.pages_this_month, label: "Pages this month" },
    { value: glance.currently_reading, label: "Currently reading" },
  ];
  return (
    <div className="grid grid-cols-3 divide-x divide-rule rounded-sm border border-rule bg-card">
      {items.map(({ value, label }) => (
        <div key={label} className="px-4 py-5 text-center" aria-label={`${label}: ${value}`}>
          <div className="font-display text-3xl text-primary tabular-nums">{value}</div>
          <div className="mt-1 text-[0.6875rem] uppercase tracking-wide text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  );
}

function RecentCover({
  copySlug,
  cover,
  title,
  author,
  meta,
}: {
  copySlug: string;
  cover: string | null;
  title: string;
  author: string;
  meta?: string;
}) {
  return (
    <Link to={`/copies/${copySlug}`} className="group block focus-visible:outline-none">
      <div className="overflow-hidden rounded-sm border border-rule bg-card shadow-[0_1px_2px_oklch(0.2_0.02_50_/_0.15)] transition-shadow group-hover:shadow-[0_2px_8px_-2px_oklch(0.2_0.02_50_/_0.2)] group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <CoverImage src={coverSrc(cover)} alt={`Cover of ${title}`} variant="card" />
      </div>
      <h3 className="mt-2 truncate font-display text-sm leading-tight text-foreground">{title}</h3>
      <Tooltip content={author}>
        <p className="truncate text-xs text-muted-foreground">{author}</p>
      </Tooltip>
      {meta && <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">{meta}</p>}
    </Link>
  );
}

function RecentlyFinishedSection({ entries }: { entries: RecentlyFinishedEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 font-display text-xl text-foreground">Recently finished</h2>
      <div className="grid grid-cols-3 gap-5 sm:grid-cols-4 lg:grid-cols-6">
        {entries.map((e) => (
          <RecentCover
            key={`${e.copy_slug}-${e.finished_date}`}
            copySlug={e.copy_slug}
            cover={e.cover}
            title={e.work?.title ?? "Untitled"}
            author={e.work?.author ?? "Unknown author"}
            meta={e.rating != null ? `★ ${e.rating.toFixed(1)}` : formatDate(e.finished_date)}
          />
        ))}
      </div>
    </section>
  );
}

function RecentlyAddedSection({ entries }: { entries: RecentlyAddedEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 font-display text-xl text-foreground">Recently added</h2>
      <div className="grid grid-cols-3 gap-5 sm:grid-cols-4 lg:grid-cols-6">
        {entries.map((e) => (
          <RecentCover
            key={e.copy_slug}
            copySlug={e.copy_slug}
            cover={e.cover}
            title={e.work?.title ?? "Untitled"}
            author={e.work?.author ?? "Unknown author"}
          />
        ))}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { data, loading, error, refetch } = useDashboard();

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8" aria-busy="true" aria-label="Loading dashboard">
        <Skeleton className="h-7 w-48" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-4 rounded-sm border border-rule p-4">
              <Skeleton className="aspect-[2/3] w-20 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="mt-4 h-1.5 w-full" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="mt-8 h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center gap-3" role="alert">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={refetch}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { currently_reading, recently_finished, recently_added, glance } = data;
  const hasBooks = recently_added.length > 0;

  // Brand-new library: nothing to show but a welcome.
  if (!hasBooks) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-rule py-24 text-center">
          <p className="font-display text-2xl text-foreground">Welcome to your reading desk.</p>
          <p className="mt-2 text-sm text-muted-foreground">Add your first book to start tracking what you read.</p>
          <Link to="/add" className={cn(buttonVariants(), "mt-5")}>Add your first book</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-8">
      <section>
        <h1 className="mb-4 font-display text-2xl text-foreground">Currently reading</h1>
        {currently_reading.length > 0 ? (
          <div className="grid items-start gap-4 sm:grid-cols-2">
            {currently_reading.map((entry, i) => (
              <CurrentlyReadingCard
                key={`${entry.copy_slug}-${entry.started_date}`}
                entry={entry}
                revealIndex={i}
                onChanged={refetch}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-rule py-14 text-center">
            <p className="font-display text-lg text-foreground">Nothing on the nightstand.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick something from your library and start a read-through.
            </p>
            <Link to="/library" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}>
              Browse the library
            </Link>
          </div>
        )}
      </section>

      <section>
        <h2 className="sr-only">Reading at a glance</h2>
        <GlanceStrip glance={glance} />
      </section>

      <RecentlyFinishedSection entries={recently_finished} />
      <RecentlyAddedSection entries={recently_added} />
    </div>
  );
}
