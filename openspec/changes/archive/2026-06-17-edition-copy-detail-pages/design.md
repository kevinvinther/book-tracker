## Context

The Work Detail page displays editions and copies as a flat list — edition headers with publisher/date/format and copy cards underneath. Neither edition headers nor copy cards link anywhere. The backend APIs for editions and copies already exist: `GET /api/editions/:slug` returns edition data plus `copy_count`; `GET /api/copies/:slug` returns copy data with `edition_meta` and `work_meta` already resolved. The missing piece is standalone detail pages for each and the navigation links to reach them.

## Goals / Non-Goals

**Goals:**
- Edition Detail page: full bibliographic metadata, link back to work, copies list with copy cards, add copy button, edit edition modal
- Copy Detail page: full ownership metadata + cover image, links to work and edition, placeholder sections for read-through history, loan history, and notes, edit copy modal
- Edition headers and copy cards on Work Detail become clickable links to their respective detail pages
- Single-fetch data model: one API call per page, no N+1

**Non-Goals:**
- Read-through, loan, and note backends — their sections on Copy Detail will show empty states ("No read-throughs yet", "No loans yet", "No notes yet")
- A generic "Add Copy" flow with full form — the add copy button on Edition Detail opens a simple modal with essential fields (condition, location, status). The full "quick add" and "manual add" flows are separate changes
- Creation of editions from the Edition Detail page (editions are created as part of the add flow, not standalone)

## Decisions

### Edition Detail enriches `work_meta` inline, matching the copy pattern

`GET /api/copies/:slug` already resolves `work_meta` (`{ slug, title, authors }`) and `edition_meta` inline. `GET /api/editions/:slug` currently returns only `copy_count`. This change adds `work_meta` to it, following the exact same pattern: extract work slug from the `[[works/slug]]` wikilink, call `index.getWork`, return `{ slug, title, authors }`.

**Rationale:** Consistency with the copy endpoint. Prevents the edition detail page from needing a second fetch for the work title.

### Both pages use existing hook pattern

`useEdition(slug)` and `useCopy(slug)` follow the exact `useWork`/`useAuthor`/`useSeries` pattern: fetch, return `{ data, loading, notFound, error, refetch }`. No new data-fetching library.

### Edition Detail layout: single-column metadata + copies list

Edition Detail is bibliographic data without a cover image of its own, so it uses a single-column layout: metadata block at top, copies list below. Each copy renders with the existing `CopyCard` component (or an inline adaptation if the card is too large for list context — but the copy card already works well at full width).

### Copy Detail layout: single-column with dedicated sections

Copy Detail shows ownership data at top (condition, status, location, acquisition, price), then three placeholder sections below: Read-through History, Loan History, Notes. Each section has a heading and an empty-state message ("No read-throughs yet.", etc.). This structure anticipates the future backend work; when those endpoints exist, the sections can be wired up without restructuring the page.

### Edit modals follow the existing `EditWorkModal` pattern

`EditEditionModal` and `EditCopyModal` use Base UI Dialog primitives, with form fields for mutable fields and a `PATCH` submission that calls `onSaved` to trigger a refetch. Fields:
- Edition: isbn, publisher, publish_date, page_count, format, language, contributors
- Copy: condition, location, cover_image, status, acquisition_date, acquisition_source, price_amount, price_currency

### Edition headers and copy cards on Work Detail become links

The edition header (`<h3>` showing publisher · year · format) on Work Detail wraps in a `<Link to="/editions/:slug">`. Each `<CopyCard>` wraps in a `<Link to="/copies/:slug">`. This is a small change within the existing `WorkDetail.tsx` page.

### Add Copy button opens a simple modal

The "Add Copy" button on Edition Detail opens a modal with fields for condition, location, status, and acquisition_source. Submits `POST /api/copies` with the edition and work slugs pre-filled. On success, refreshes the page so the new copy appears in the list.

## Risks / Trade-offs

- **Copy Detail sections look empty** (read-through, loans, notes) → intentional placeholder structure; communicated in the proposal as deferred. The sections serve as forward-looking scaffolding.
- **Copy cards become links** on Work Detail but not on Edition Detail → on the Edition Detail page, copy cards remain non-linked because the user is already on a detail view focused on editions/copies. Adding another level of indirection would be confusing.
- **Add Copy modal is minimal** vs the eventual full add flow → accepts basic fields now; the full flow will replace or augment this later without API breakage since both use the same `POST /api/copies`.
- **`GET /api/editions/:slug` response shape change** is additive (only adds `work_meta` field) → no existing frontend consumer, so safe extension.
