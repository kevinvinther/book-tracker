## Supersedes

None.

## Why

The app has search only within Works (title, author, genre) and Note body text. There is no way to find an Edition by ISBN, a Copy by location or acquisition source, an Author by name, a Series by name, a Loan by borrower, or a Note by body text from a single search. Every entity type is in memory already — the user just can't reach it except by clicking through detail pages.

## What Changes

- New `GET /api/search?q=` endpoint that searches across all entity types simultaneously using the in-memory index.
- New `searchAll(query)` method on the `Index` class that matches against:
  - Works: title, authors (resolved names), genres, description, aliases
  - Authors: name, aliases
  - Series: name, aliases
  - Editions: ISBN, publisher
  - Copies: acquisition_source, location
  - Notes: body text
  - Loans: borrower_name
- Results grouped by entity type (Works → Authors → Series → Editions → Copies → Notes → Loans), capped at 5 per type, ordered by relevance.
- Each result carries type, slug, display title, subtitle/context, and a frontend navigation link.
- Global search bar added to the app header, always visible across all pages.
- Keyboard shortcuts `/` and `Ctrl+K` (guarded against text input focus) to focus the search input.
- Debounced auto-search (~200ms) as user types; results appear in a dropdown anchored to the search bar.
- Recent searches stored in localStorage (max 5 query strings), shown when the input is empty.
- Note results navigate to the most specific parent (copy → edition → work).
- Loan results navigate to the parent copy page.

## Capabilities

### New Capabilities

- `global-search-api`: The `GET /api/search?q=` endpoint returning grouped cross-entity search results from the in-memory index.
- `global-search-ui`: The search bar in the app header with a results dropdown, keyboard shortcuts, and recent searches.

### Modified Capabilities

- `in-memory-index`: Adds a `searchAll(query)` method that searches across all six entity types plus embedded loan and read-through data, returning grouped results. This extends the existing `searchWorks` from Works-only to all entities.

## Impact

- **Index class** (`server/src/lib/index.ts`): new `searchAll` method, no changes to existing methods.
- **New route file** `server/src/routes/search.ts`: registers `GET /api/search?q=`.
- **Server entry** (`server/src/index.ts`): imports and mounts the search router.
- **App header** (`client/src/App.tsx`): search bar component in the header nav, plus keyboard shortcut handling.
- **New hook** `client/src/hooks/useSearch.ts`: debounced fetch to `/api/search`.
- **New component**: search results dropdown with grouped sections.
- **Index tests** (`server/src/lib/index.test.ts`): add tests for `searchAll`.
- **Search route tests**: new test file for the endpoint.
