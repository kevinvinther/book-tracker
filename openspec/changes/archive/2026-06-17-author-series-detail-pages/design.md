## Context

The frontend already has a Work Grid (home page) and Work Detail page. Work Detail links authors to `/authors/:slug` and series to `/series/:slug`, but those routes don't exist yet — clicking them does nothing. The backend Author API (`GET /api/authors/:slug`) already resolves a flat `works` array with `{ slug, title }`, and the Series API (`GET /api/series/:slug`) resolves `works` with `{ slug, title, series_position }`, sorted by position. However, both APIs return minimal work data — the frontend would need N+1 requests per work to get cover images, copy counts, and author names. This change adds the two navigation hub pages and enriches the backend responses with enough inline metadata to avoid N+1 fetches.

## Goals / Non-Goals

**Goals:**
- Author Detail page: author name, aliases, list of works with cover thumbnails, title, copy count, aggregate read status
- Series Detail page: series name, ordered work list with title + read status, placeholders for books not yet in the library
- Enriched `GET /api/authors/:slug` and `GET /api/series/:slug` so one fetch per page is sufficient
- Links from Work Detail to author/series pages actually navigate somewhere useful
- Edit Author and Edit Series buttons (modals in model form factor following the existing `EditWorkModal` pattern)

**Non-Goals:**
- Read-status badges (depends on read-through backend, not yet built). Work cards on author/series pages will match the current WorkCard state on the grid.
- Edit Author / Edit Series modals beyond a simple form (name, aliases for author; name, total_works for series). No bulk-operations or work reordering on Series Detail.
- Author detail search or filtering (authors aren't numerous enough to need it).
- A standalone "Authors" or "Series" index page (just the per-entity detail pages for now).

## Decisions

### Backend enriches inline to avoid N+1 fetches

`GET /api/authors/:slug` currently returns works as `{ slug, title }[]`. This change extends each work entry to also include `primary_cover`, `copy_count`, and `edition_count` (pulled from the in-memory index). `GET /api/series/:slug` currently returns `{ slug, title, series_position }[]` — this change adds `authors_meta` (so author names render), `primary_cover`, `edition_count`, and `copy_count`.

**Rationale:** The Work Grid already follows this pattern (list endpoint resolves `authors_meta`, `copy_count` inline). A single fetch per detail page is faster and simpler than the frontend firing 1 + N requests per author/series page. The CPU cost of resolving from the index is negligible.

### Author work sorting: alphabetical by title

The build plan says "sorted by most recently interacted-with," but no interaction-tracking data exists yet (read-throughs, notes, and loans aren't built). Alphabetical by title is deterministic, useful for browsing, and a sane default. The sort can be upgraded to interaction-based sorting once read-through/note data exists in the index.

**Alternative considered:** Sorting by `created_at` (date added to library) — more mechanical and less useful for navigating an author's oeuvre.

### Series placeholders use a simple computed list

If `total_works` is set and greater than the number of linked works, the frontend renders placeholder rows (e.g., "Book #3 — Upcoming"). The placeholder count is `total_works - linkedWorks.length`. If `total_works` is unset, no placeholders are shown.

**Rationale:** The existing data model already has `total_works`. The feature is explicitly in the build plan. The placeholder slots are generated client-side as a simple map over the missing position range.

### Single-use data hooks, same pattern as existing hooks

`useAuthor(slug)` and `useSeries(slug)` follow the exact pattern of `useWork(slug)`: fetch from a single endpoint, return `{ data, loading, error }`, with a `refetch` callback and `notFound` detection. No new data-fetching library.

**Rationale:** Consistency with the existing hooks (`useWork`, `useWorks`, `useEditionsByWork`, `useCopiesByWork`). Adding TanStack Query for two more pages isn't justified.

### Visual design follows the established "literary archive" aesthetic

No new visual decisions needed. Author and Series Detail pages reuse:
- The same two-column layout (with left-side cover or placeholder, right-side metadata) where applicable
- Fraunces for display headings, Geist Variable for UI
- Warm paper background + oxblood accent palette
- The `paper-grain` background class
- `WorkCard` component for each work in the list (same card used on the grid)

### Edit Author / Edit Series modals follow `EditWorkModal` pattern

Each page has an edit button that opens a modal dialog (Base UI Dialog, same primitives as `EditWorkModal`). Author modal: name, aliases. Series modal: name, total_works. Both submit `PATCH` to their respective API endpoints and call `refetch` on success.

### Author and Series types added to client `types.ts`

New client-side interfaces `Author` and `Series` mirror the enriched API responses:
- `Author`: type, slug, name, aliases?, created_at, works (enriched WorkCardInfo[])
- `Series`: type, slug, name, total_works?, aliases?, created_at, works (enriched SeriesWorkInfo[])

## Risks / Trade-offs

- **Work cards on Author/Series Detail look sparse** (no read-status badges, note counts, or loan badges) → matches the current Work Grid state; will improve when those backends are built and the Work Card is enhanced in-place.
- **No consistent "most recently interacted-with" sort** → alphabetical title sort is a reasonable stopgap; revisit with a proper implementation once interaction data exists (read-throughs, notes, and loans).
- **`GET /api/authors/:slug` response shape change** technically modifies the contract → no existing frontend consumer of this endpoint, so it's a safe extension (only adds fields, doesn't remove).
- **Series placeholders are client-side-only** → if someone manually adds a work at position 5 when positions 3–4 are placeholders, the visual presentation may look off. Acceptable for a personal-use app; the user can adjust `total_works` or add missing works.
