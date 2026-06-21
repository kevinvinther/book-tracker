## Why

Entity markdown files currently have empty or trivial bodies (e.g., `# Title`). The markdown body is the canonical human-readable render that Obsidian users see when browsing the library as a vault. Without rendered bodies, the Obsidian experience is barren — no metadata summaries, no reading history tables, no notes lists. This change implements the server-side render functions that produce rich markdown bodies from frontmatter, exposes them to the web app client, and displays them as a preview on detail pages.

## Supersedes

None.

## What Changes

- **New server module** `server/src/lib/render-body.ts` with five entity-specific render functions (`renderWorkBody`, `renderEditionBody`, `renderCopyBody`, `renderAuthorBody`, `renderSeriesBody`) and a `renderBody` dispatcher
- **New test file** `server/src/lib/render-body.test.ts` covering each render function with inline snapshot-style assertions
- **API response enrichment**: the five detail `GET` endpoints (`/api/works/:slug`, `/api/editions/:slug`, `/api/copies/:slug`, `/api/authors/:slug`, `/api/series/:slug`) gain a `body` field in their JSON response — rendered in-memory on each request, no disk write
- **Client display**: each of the five detail pages (Work, Edition, Copy, Author, Series) gains a collapsible `<details>` "Markdown Preview" section at the bottom, rendered with `react-markdown`, styled to match the existing UI

## Capabilities

### New Capabilities

- `body-rendering`: Server-side markdown body generation from frontmatter + in-memory Index data, for all five entity types. Includes a dispatcher function and comprehensive tests.

### Modified Capabilities

- `work-api`: `GET /api/works/:slug` response gains a `body` field (always included)
- `edition-api`: `GET /api/editions/:slug` response gains a `body` field (always included)
- `copy-api`: `GET /api/copies/:slug` response gains a `body` field (always included)
- `author-api`: `GET /api/authors/:slug` response gains a `body` field (always included)
- `series-api`: `GET /api/series/:slug` response gains a `body` field (always included)
- `work-detail-page`: New collapsible "Markdown Preview" section at page bottom
- `edition-detail-page`: New collapsible "Markdown Preview" section at page bottom
- `copy-detail-page`: New collapsible "Markdown Preview" section at page bottom
- `author-detail-page`: New collapsible "Markdown Preview" section at page bottom
- `series-detail-page`: New collapsible "Markdown Preview" section at page bottom

## Impact

- **Server code**: New file `render-body.ts` in `server/src/lib/`; modifications to five route files (`works.ts`, `editions.ts`, `copies.ts`, `authors.ts`, `series.ts`) to call `renderBody()` in detail endpoints
- **Client code**: Modifications to five page files (`WorkDetail.tsx`, `EditionDetail.tsx`, `CopyDetail.tsx`, `AuthorDetail.tsx`, `SeriesDetail.tsx`) to fetch, render, and display the `body` field
- **Dependencies**: `react-markdown` already exists in client; no new dependencies needed
- **No breaking changes**: `body` field is additive to existing API responses; all existing fields and behavior preserved
- **No disk writes** in this change — bodies are computed in-memory only; writing to disk on save is a follow-up change
