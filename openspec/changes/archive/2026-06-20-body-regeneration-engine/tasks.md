## 1. Server — Body Rendering Functions

- [x] 1.1 Create `server/src/lib/render-body.ts` with helper functions for date formatting (`formatDate` for "Jun 1, 2025" headers, `toDateOnly` for YYYY-MM-DD table cells) and wikilink slug extraction
- [x] 1.2 Implement `renderWorkBody(work, index)` — generates `# {title}`, author/year/language line, `## Description`, `## Editions` with wikilink bullets including publisher/year/translator/pages
- [x] 1.3 Implement `renderEditionBody(edition, index)` — generates heading with priority chain (translator > publisher > format > pages > bare), metadata block, `## My Copies` list, `## Notes` list
- [x] 1.4 Implement `renderCopyBody(copy, index)` — generates heading, metadata block, `## Reading History` (one `###` subsection per read-through with newest-first Date/Page/% table), `## Loan History` table, `## Notes` wikilink list
- [x] 1.5 Implement `renderAuthorBody(author, index)` — generates `# {name}`, `## My Works` wikilink bullet list
- [x] 1.6 Implement `renderSeriesBody(series, index)` — generates `# {name}`, ordered numbered works list by `series_position`
- [x] 1.7 Implement `renderBody(entity, index)` dispatcher — switches on `entity.type` to the correct render function

## 2. Server — API Response Enrichment

- [x] 2.1 Import `renderBody` in `server/src/routes/works.ts` and add `body` field to `GET /api/works/:slug` response
- [x] 2.2 Import `renderBody` in `server/src/routes/editions.ts` and add `body` field to `GET /api/editions/:slug` response
- [x] 2.3 Import `renderBody` in `server/src/routes/copies.ts` and add `body` field to `GET /api/copies/:slug` response
- [x] 2.4 Import `renderBody` in `server/src/routes/authors.ts` and add `body` field to `GET /api/authors/:slug` response
- [x] 2.5 Import `renderBody` in `server/src/routes/series.ts` and add `body` field to `GET /api/series/:slug` response

## 3. Server — Tests

- [x] 3.1 Create `server/src/lib/render-body.test.ts` with Vitest imports from project conventions
- [x] 3.2 Write test for `renderWorkBody` — work with all fields, work with no optional fields, edition with translator, edition without page_count
- [x] 3.3 Write test for `renderEditionBody` — edition with translator, edition with publisher, copies list, no copies, notes list
- [x] 3.4 Write test for `renderCopyBody` — full copy with read-throughs, DNF read-through, loans table, notes list, read-throughs with no page_count, heading priority chain, no read-throughs/loans
- [x] 3.5 Write test for `renderAuthorBody` — author with works, author without works
- [x] 3.6 Write test for `renderSeriesBody` — series with positioned works, unpositioned works, empty series
- [x] 3.7 Write test for `renderBody` dispatcher — routes correctly per entity type, throws on unknown type
- [x] 3.8 Run `npm run test -- --run` from `server/` and verify all tests pass

## 4. Client — Markdown Preview Sections

- [x] 4.1 Add collapsible `<details>` "Markdown Preview" section to `WorkDetail.tsx` using `react-markdown` to render `work.body`
- [x] 4.2 Add collapsible `<details>` "Markdown Preview" section to `EditionDetail.tsx` using `react-markdown` to render `edition.body`
- [x] 4.3 Add collapsible `<details>` "Markdown Preview" section to `CopyDetail.tsx` using `react-markdown` to render `copy.body`
- [x] 4.4 Add collapsible `<details>` "Markdown Preview" section to `AuthorDetail.tsx` using `react-markdown` to render `author.body`
- [x] 4.5 Add collapsible `<details>` "Markdown Preview" section to `SeriesDetail.tsx` using `react-markdown` to render `series.body`

## 5. Client — Type Updates

- [x] 5.1 Add `body: string` to the server-side response shape for works, editions, copies, authors, and series in `server/src/lib/types.ts` or inline in route handlers
- [x] 5.2 Ensure client-side types in `client/src/lib/types.ts` accept `body?: string` on detail response types (Work, CopyFull, EditionFull, etc.)

## 6. Verification

- [x] 6.1 Run `npm run typecheck` (or `npx tsc --noEmit`) from `server/` and fix any type errors
- [x] 6.2 Run `npm run typecheck` (or `npx tsc --noEmit`) from `client/` and fix any type errors
- [x] 6.3 Run `npm run test -- --run` from `server/` and verify all tests pass
- [ ] 6.4 Start the app (`npm run dev`), create test data, and verify each detail page shows the "Markdown Preview" section with correctly rendered content
