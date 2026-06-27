## 1. Dependency and shared helpers

- [x] 1.1 Add `cheerio` to `server` dependencies and install
- [x] 1.2 Add an `isbn13ToIsbn10` helper (drop `978` prefix, recompute mod-11 check digit; return null for `979`-prefixed) with unit tests
- [x] 1.3 Add a browser-like `User-Agent` constant and a small `fetchHtml` wrapper around `fetchWithTimeout` for scrape requests
- [x] 1.4 Add a typed scrape error (carrying a `reason` label: `blocked`/`timeout`/`parse_error`/`http_error`) and classify HTTP 403/429/503 + CAPTCHA interstitials as blocked

## 2. Source model changes in `lookup.ts`

- [x] 2.1 Extend `SourceId` and `LookupResult.source` union with `goodreads`, `amazon`, `googleimages`, `kindlecovers`
- [x] 2.2 Change the fetcher contract to receive `{ isbn, title, author }` context; update existing `google`/`openlibrary` fetchers to the new signature (ignoring title/author)
- [x] 2.3 Add `DEFAULT_SOURCES = [google, openlibrary, goodreads, amazon]`; keep `ALL_SOURCES` as all six
- [x] 2.4 Change `lookupSource`/`lookupAllSources` to return `{ results, errors }`, where rejected fetchers become `{ source, reason }` errors, `null` returns are silently omitted, and only results are cached

## 3. Scraper implementations

- [x] 3.1 Goodreads scraper: locate book via ISBN search, parse title/subtitle/authors/publisher/publish_date/page_count/format/language/description/genres(shelves)/cover; omit absent fields
- [x] 3.2 Amazon scraper (amazon.com): resolve ISBN-10 (or search for `979`), parse the product page for the same best-effort field set + cover
- [x] 3.3 Google Images cover-only scraper: build a `title + author` query, return only `cover_url`; no-result when title missing
- [x] 3.4 Kindle covers cover-only scraper: Amazon Kindle-store image search by `title + author`, return only `cover_url`
- [x] 3.5 Register all four in `SOURCE_FETCHERS`

## 4. Endpoint changes in `routes/lookup.ts`

- [x] 4.1 Accept optional `title` and `author` query params and pass them into the lookup context
- [x] 4.2 Default to `DEFAULT_SOURCES` when `sources` is omitted; keep validation against `ALL_SOURCES`
- [x] 4.3 Return `{ results, errors }` from `GET /api/lookup/all`

## 5. Client (`EnrichPanel.tsx` and types)

- [x] 5.1 Add the four sources to the panel's source list and labels; default `google`/`openlibrary`/`goodreads`/`amazon` checked and `googleimages`/`kindlecovers` unchecked
- [x] 5.2 Forward the current `title` and `author(s)` as `title`/`author` query params on fetch
- [x] 5.3 Read `errors` from the response and render a per-source "blocked / failed" note
- [x] 5.4 Extend `SourceLookupResult.source` and related lookup types in `client/src/lib/types.ts`
- [x] 5.5 Add an "Add" (merge) action for the genres field that unions the source's genres into the current set; "Use" still replaces

## 6. Tests and verification

- [x] 6.1 Server tests for `lookupAllSources` results/errors split and `DEFAULT_SOURCES` fallback (fetchers mocked/stubbed)
- [x] 6.2 Route tests for `title`/`author` params and the `{ results, errors }` response shape
- [x] 6.3 Per-source parsers tested against saved HTML fixtures for each scraper (happy path + blocked + no-match)
- [x] 6.4 Manual check in the edit page: enable a scraper, fetch, adopt a field and a cover, save; confirm cover downloads only on save
