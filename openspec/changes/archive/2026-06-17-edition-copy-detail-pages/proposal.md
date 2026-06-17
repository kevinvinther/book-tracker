## Why

The Work Detail page shows editions and copies but only as flat cards with minimal info. There's no way to link into or navigate to a full edition or copy page — the edition headers and copy cards on Work Detail are not clickable. The build plan calls these out as distinct navigation targets, and once built, links from the Work Detail and future search results will finally have a destination.

## What Changes

- New Edition Detail page (`/editions/:slug`): full metadata (publisher, date, pages, format, language, ISBN, contributors), link back to the parent work, list of copies with card-per-copy, add copy button, edit edition button
- New Copy Detail page (`/copies/:slug`): full metadata (links to work and edition, format, condition, status, cover image, location, acquisition info, price), sections for read-through history, loan history, and notes with empty states, edit copy button
- `GET /api/editions/:slug` extended to resolve `work_meta` (slug, title, authors) inline so the edition detail page doesn't need N+1 fetches

## Capabilities

### New Capabilities
- `edition-detail-page`: Full Edition detail view — metadata, work link, copies list, add copy button, edit edition modal
- `copy-detail-page`: Full Copy detail view — metadata, work and edition links, read-through history section (empty), loan history section (empty), notes section (empty), edit copy modal

### Modified Capabilities
- `edition-api`: `GET /api/editions/:slug` additionally resolves `work_meta` with work slug, title, and authors

## Impact

- New files: `client/src/pages/EditionDetail.tsx`, `client/src/pages/CopyDetail.tsx`
- New hooks: `client/src/hooks/useEdition.ts`, `client/src/hooks/useCopy.ts`
- New components: `client/src/components/EditEditionModal.tsx`, `client/src/components/EditCopyModal.tsx`
- `client/src/lib/types.ts` — new `EditionFull`, `CopyFull` types for enriched API responses
- `client/src/App.tsx` — add `/editions/:slug` and `/copies/:slug` routes
- `server/src/routes/editions.ts` — extend `GET /:slug` handler to resolve `work_meta`
