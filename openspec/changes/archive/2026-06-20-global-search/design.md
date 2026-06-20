## Context

The in-memory `Index` class holds all six entity types (Author, Series, Work, Edition, Copy, Note) parsed from the file system at startup. Currently the only cross-entity search is `searchWorks()`, which searches Works by title, author name, genre, and aliases. Notes have a separate body-text search in their route handler. There is no unified way to search the entire library.

The app header (`client/src/App.tsx`) currently shows a simple nav bar with the app name, Stats link, and Settings link. There is no search bar.

## Goals / Non-Goals

**Goals:**
- Add a `searchAll(query)` method to the `Index` class that searches across all entity types, including embedded loan data within copies.
- Expose the search as a `GET /api/search?q=` endpoint.
- Add a persistent search bar in the app header with a grouped-results dropdown, keyboard shortcuts, and recent searches.
- Each result provides enough context (type, title, subtitle) for the user to identify it and a link to the relevant detail page.

**Non-Goals:**
- Fuzzy matching or typo tolerance — strict substring matching only.
- Full-text indexing or search ranking libraries.
- Cross-type result interleaving — results are grouped by entity type.
- Deep-linking to modals or scroll positions on detail pages.
- Searching within series position, page count, or numeric fields.
- Search-as-you-type on the `/api/search` endpoint in the WorkGrid page (that page retains its existing `GET /api/works?q=` search).

## Decisions

### 1. `searchAll` lives on the Index class, endpoint is a thin wrapper

The Index already holds all data in memory and already has `searchWorks`. Adding `searchAll` there keeps the search logic testable without HTTP, consistent with the existing pattern, and fast (no I/O — pure in-memory iteration). The route handler calls `index.searchAll(q)` and formats the result for JSON.

**Alternative considered:** Put search logic directly in the route handler. Rejected because it makes testing harder and breaks the established pattern of index-as-search-layer.

### 2. Loan results are extracted from copies

Loans are embedded arrays inside Copy YAML, not standalone files. The `searchAll` method iterates all copies, checks each loan's `borrower_name`, and returns a loan-shaped result that includes a reference back to the parent copy slug for navigation.

### 3. Relevance ordering: exact match → prefix match → substring

Within each type group, results are sorted with a simple three-tier ordering:
1. Exact match on the primary field (e.g. title === query, case-insensitive)
2. Prefix match (starts with query)
3. Substring match (contains query)

Within the same tier, alphabetical order is used. This is deterministic, computationally cheap, and avoids pulling in a scoring library.

**Alternative considered:** Levenshtein distance or Fuse.js fuzzy matching. Rejected for v1 because substring matching on clean, user-curated data is usually sufficient, and fuzzy matching can produce confusing results for short queries.

### 4. Note navigation uses copy → edition → work fallback

When a note search result is clicked, the frontend resolves the navigation target by checking the note's optional parent references in priority order: `copy` → `edition` → `work`. A note must have at least one of these set (enforced by the Note creation endpoint), so a link is always available.

### 5. Debounced fetch via custom hook

A `useSearch(query)` hook wraps a `fetch()` to `/api/search?q=` with a 200ms debounce. Empty queries short-circuit and return no results. The hook exposes `{ results, isLoading, error }` for the search bar component.

### 6. Keyboard shortcut guard

Global `keydown` listener in the search bar component checks `event.target` — if focus is in an `input`, `textarea`, or `[contenteditable]` element, `/` is not intercepted. `Ctrl+K` always opens search regardless of focus, matching OS-level search palette conventions.

### 7. Recent searches in localStorage

Stored as a JSON-serialized array under the key `booktracker-recent-searches`, max 5 entries. New queries are prepended; duplicates are moved to the front. Shown as clickable items in the dropdown when the search input is empty. No expiry or clearing logic beyond the cap.

### 8. Search bar placement in the header

The search bar sits between the app logo and the nav links in `App.tsx`'s `<header>`. It uses a shadcn `<Input>` with a search icon prefix, wrapped in a `<div>` with relative positioning so the results dropdown anchors to it. On mobile, the search bar stretches to full width below the nav row.

## Risks / Trade-offs

- **O(n) scan per search**: `searchAll` iterates all entities on every call. For 10,000 entities this is ~5-10ms — acceptable for a local single-user app. If the library grows to 100,000+, an inverted index could be added later. Mitigation: cap per-type results to 5 so the scan always returns early after finding enough matches.
- **Substring-only matching**: Users typing "dostoyevsky" won't find "Dostoevsky". Mitigation: the app already stores `aliases` on Authors and Works for alternate spellings, which are searched as well. Transliteration variants can be added as aliases.
- **Loan results are shallow**: Only `borrower_name` is searched. Loan dates, return status, etc. are not matched. Mitigation: documented as out of scope for v1.
- **Dropdown position on mobile**: The dropdown anchored to a header input may overflow on small screens. Mitigation: the dropdown uses `max-h` with overflow-y scroll.
