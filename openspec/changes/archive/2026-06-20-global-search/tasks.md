## 1. Backend: Index searchAll method

- [x] 1.1 Add `SearchResult` and `SearchResults` types to `server/src/lib/types.ts`
- [x] 1.2 Add `searchAll(query)` method to `Index` class in `server/src/lib/index.ts` — iterates all entity types, applies search per spec fields, sorts by relevance within groups, caps at 5 per type, returns grouped results
- [x] 1.3 Add tests for `searchAll` in `server/src/lib/index.test.ts` — cover empty query, no matches, exact/prefix/substring ordering, per-type cap, each entity type match, note snippet generation, loan search, note link resolution

## 2. Backend: Search route

- [x] 2.1 Create `server/src/routes/search.ts` — `GET /api/search?q=` endpoint using `createSearchRouter(index)` factory, wraps `index.searchAll(q)`, returns JSON
- [x] 2.2 Create `server/src/routes/search.test.ts` — test endpoint returns grouped results, handles missing `q` param (400), empty query returns empty groups
- [x] 2.3 Register search route in `server/src/index.ts` — import and mount `/api/search`

## 3. Frontend: Search hook

- [x] 3.1 Create `client/src/hooks/useSearch.ts` — wraps `fetch("/api/search?q=...")` with 200ms debounce, returns `{ results, isLoading, error }`, short-circuits empty query
- [x] 3.2 Add search result types to `client/src/lib/types.ts` — `SearchResult` and `SearchResults` interfaces matching the API response

## 4. Frontend: Search bar component

- [x] 4.1 Create `client/src/components/GlobalSearch.tsx` — search input with dropdown, grouped results, recent searches from localStorage, keyboard shortcuts (`/` guarded, `Ctrl+K` always), Escape to close
- [x] 4.2 Wire GlobalSearch into `client/src/App.tsx` header — between logo and nav links
