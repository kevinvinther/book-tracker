## Why

Today there is no way to combine two Works that already exist. The quick-add/manual-add flows have dedup and `attachToWorkSlug` for *creating* editions against an existing work, but once two duplicate Works exist (different ISBN lookups, slightly different titles, manual entries), the user has no cleanup path short of deleting one and re-adding everything by hand. A merge operation lets the curator pick a winner, re-parent every Edition/Copy/Note from the loser onto the winner, absorb non-conflicting metadata, and delete the loser — in one atomic action.

## Supersedes

None.

## What Changes

- New `POST /api/works/merge` endpoint accepting `{ winner, loser }` JSON body of two work slugs. The loser's editions, copies, and notes have their `work` wikilink rewritten to point at the winner; the winner absorbs the loser's non-conflicting metadata (authors union, genres union, aliases appended, scalar fields filled from loser where winner has none); the loser's title is appended as an alias on the winner; the loser Work file is deleted.
- Rejects with 400 when `winner === loser`, 404 when either slug does not exist.
- Slugs remain immutable: edition/copy/note slugs are not regenerated even though their parent work slug changes. The loser's slug becomes free for reuse after deletion.
- Re-read-before-write and atomic temp+rename apply to every file rewritten (winner, each edition, each copy, each note).
- WebSocket change notifications fire automatically via the existing file watcher; no manual broadcasting in the handler.
- New "Merge with another work…" action on the Work Detail page opens a modal that searches the loser via the existing `searchWorks` index method, previews the absorption (genres, aliases, count of editions/copies/notes to re-parent), and requires confirmation before issuing the merge.

## Capabilities

### New Capabilities
- `work-merge`: Backend `POST /api/works/merge` that re-parents the loser Work's editions, copies, and notes onto the winner, absorbs non-conflicting metadata, and deletes the loser — atomically and immutably.
- `work-merge-ui`: Client-side modal launched from the Work Detail page for selecting a loser work, previewing the absorption, and confirming the merge.

### Modified Capabilities
- `work-detail-page`: Adds a "Merge with another work…" action that opens the merge modal.

## Impact

- New server file: `server/src/routes/merge.ts` (or extension of `works.ts`) registering `POST /api/works/merge` on the works router.
- `server/src/index.ts` — register the merge route alongside `/api/works`.
- New client component: `client/src/components/MergeWorksModal.tsx` (or co-located in WorkDetail).
- `client/src/pages/WorkDetail.tsx` — add "Merge with another work…" action and modal host.
- Reuses existing primitives: `readFile`, `writeFile`, `deleteFile`, `renderBody`, `normalizeGenre`, `Index.getEditionsByWork`, `Index.getCopiesByWork`, `Index.getNotesByWork` (or equivalent note-by-work lookup), `searchWorks`.
- No schema changes. No new npm dependencies.
- Loans need no separate handling — they are nested under `Copy.loans[]` and move with the copy automatically.
