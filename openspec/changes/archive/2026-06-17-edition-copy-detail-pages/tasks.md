## 1. Backend: enrich edition API response

- [x] 1.1 In `server/src/routes/editions.ts`, extend `GET /:slug` to resolve `work_meta` (`{ slug, title, authors }`) from the in-memory index by extracting the work slug from the edition's `[[works/slug]]` wikilink
- [x] 1.2 Add/update tests in `server/src/routes/editions.test.ts` for `work_meta` resolution

## 2. Frontend: types and hooks

- [x] 2.1 Add `EditionFull`, `CopyFull` interfaces to `client/src/lib/types.ts`, matching the enriched API response shapes (edition with work_meta, copy with edition_meta and work_meta already present)
- [x] 2.2 Create `useEdition(slug)` hook wrapping `GET /api/editions/:slug` — returns `{ edition, loading, notFound, error, refetch }`
- [x] 2.3 Create `useCopy(slug)` hook wrapping `GET /api/copies/:slug` — returns `{ copy, loading, notFound, error, refetch }`

## 3. Frontend: Edition Detail page

- [x] 3.1 Create `client/src/pages/EditionDetail.tsx` — displays edition metadata (publisher, publish_date, page_count, format, language, ISBN, contributors), link to parent work (with title), copies list, add copy button, edit edition button
- [x] 3.2 Each copy entry: renders with the existing `CopyCard` component, wrapped in a `<Link to="/copies/:slug">`
- [x] 3.3 Empty state: "No copies of this edition yet" when copies list is empty
- [x] 3.4 Not-found state: "No such edition" with link back to home page

## 4. Frontend: Copy Detail page

- [x] 4.1 Create `client/src/pages/CopyDetail.tsx` — displays copy metadata (cover image or placeholder, condition, status, location, acquisition date, acquisition source, price), links to parent work and edition
- [x] 4.2 Read-through History section with heading and "No read-throughs yet." empty state
- [x] 4.3 Loan History section with heading and "No loans yet." empty state
- [x] 4.4 Notes section with heading and "No notes yet." empty state
- [x] 4.5 Edit Copy button
- [x] 4.6 Not-found state: "No such copy" with link back to home page

## 5. Frontend: Edit modals and Add Copy modal

- [x] 5.1 Create `EditEditionModal` component — Base UI Dialog with fields for isbn, publisher, publish_date, page_count, format, language, contributors; submits `PATCH /api/editions/:slug`
- [x] 5.2 Create `EditCopyModal` component — Base UI Dialog with fields for condition, location, cover_image, status, acquisition_date, acquisition_source, price_amount, price_currency; submits `PATCH /api/copies/:slug`
- [x] 5.3 Create `AddCopyModal` component — Base UI Dialog with fields for condition, location, status, acquisition_source; submits `POST /api/copies` with pre-filled edition and work slugs; refreshes page on success

## 6. Frontend: Wire links on Work Detail

- [x] 6.1 Make edition headers on Work Detail clickable — wrap the `<h3>` in a `<Link to="/editions/:slug">`
- [x] 6.2 Make copy cards on Work Detail clickable — wrap each `<CopyCard>` in a `<Link to="/copies/:slug">`

## 7. Frontend: routing

- [x] 7.1 Add `/editions/:slug` and `/copies/:slug` routes to `client/src/App.tsx`

## 8. Verification

- [x] 8.1 Run full server test suite, confirm all tests pass
- [x] 8.2 Run client TypeScript check, confirm no type errors
- [x] 8.3 Start dev server + client, manually verify: navigate to an edition from Work Detail → edition page loads with metadata and copies; navigate to a copy → copy page loads with metadata and empty sections; add a copy from edition detail; edit edition and copy fields