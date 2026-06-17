## 1. Backend: enrich author API response

- [x] 1.1 In `server/src/routes/authors.ts`, extend `GET /:slug` to resolve each work's `primary_cover`, `edition_count` (via `index.getEditionsByWork`), and `copy_count` (via `index.getCopiesByWork`), and sort works alphabetically by title
- [x] 1.2 Add/update tests in `server/src/routes/authors.test.ts` for enriched work data (with cover, without cover, with editions/copies, empty works array)

## 2. Backend: enrich series API response

- [x] 2.1 In `server/src/routes/series.ts`, extend `GET /:slug` to resolve each work's `authors_meta` (via `index.getAuthor` per author wikilink), `primary_cover`, `edition_count`, and `copy_count`
- [x] 2.2 Add/update tests in `server/src/routes/series.test.ts` for enriched work data (with authors_meta, with/without cover, with editions/copies, empty works array)

## 3. Frontend: types and hooks

- [x] 3.1 Add `Author` and `Series` interfaces, plus `EnrichedWorkInAuthor` and `EnrichedWorkInSeries` interfaces to `client/src/lib/types.ts`, matching the enriched API response shapes
- [x] 3.2 Create `useAuthor(slug)` hook wrapping `GET /api/authors/:slug` — returns `{ author, loading, notFound, error, refetch }` (same pattern as `useWork`)
- [x] 3.3 Create `useSeries(slug)` hook wrapping `GET /api/series/:slug` — returns `{ series, loading, notFound, error, refetch }` (same pattern as `useWork`)

## 4. Frontend: Author Detail page

- [x] 4.1 Create `client/src/pages/AuthorDetail.tsx` — displays author name as heading, aliases (if present), and a list of work cards
- [x] 4.2 Each work card: cover thumbnail (via `/api/attachments/` or placeholder if null), title (as link to `/works/:slug`), copy count, using the existing `WorkCard` component or a simplified inline render if the full card is too large for a list context
- [x] 4.3 Empty state: "No works yet" when the works array is empty
- [x] 4.4 Not-found state: "No such author" with link back to home page

## 5. Frontend: Series Detail page

- [x] 5.1 Create `client/src/pages/SeriesDetail.tsx` — displays series name as heading and ordered work list
- [x] 5.2 Each work entry: position number badge, cover thumbnail (or placeholder), title (as link to `/works/:slug`), first author name, copy count
- [x] 5.3 Series placeholders: when `total_works > works.length`, render "Upcoming" placeholder rows for the missing count
- [x] 5.4 Empty state: "No works in this series yet" when works array is empty and `total_works` is not set
- [x] 5.5 Not-found state: "No such series" with link back to home page

## 6. Frontend: Edit modals

- [x] 6.1 Create `EditAuthorModal` component — Base UI Dialog with form fields for `name` and `aliases`, submits `PATCH /api/authors/:slug`, calls `onSaved` on success
- [x] 6.2 Create `EditSeriesModal` component — Base UI Dialog with form fields for `name` and `total_works`, submits `PATCH /api/series/:slug`, calls `onSaved` on success

## 7. Frontend: routing

- [x] 7.1 Add `/authors/:slug` and `/series/:slug` routes to `client/src/App.tsx`
- [x] 7.2 Add "Authors" and "Series" nav links to the header (optional, per design decision) — skipping unless the build plan requires it; current header is minimal

## 8. Verification

- [x] 8.1 Run full server test suite, confirm all tests pass
- [x] 8.2 Run client TypeScript check, confirm no type errors
- [x] 8.3 Start dev server + client, manually verify: navigate to an author from Work Detail → author page loads with works and covers; navigate to a series → series page loads with ordered works and placeholders; edit author/series modals save and refresh
