## Context

The enrich panel (`EnrichPanel.tsx`) and the `GET /api/lookup/all` endpoint already implement a multi-source, field-by-field metadata picker over two clean JSON APIs (Google Books, Open Library). The source layer in `server/src/lib/lookup.ts` models each source as a fetcher `(isbn) => Promise<Omit<LookupResult, "source"> | null>` registered in `SOURCE_FETCHERS`, run in parallel via `Promise.allSettled` (`lookupAllSources`), cached per-source at `.booktracker/cache/{isbn}.{source}.json`, and returns raw `cover_url`s that are downloaded only when the edit page saves.

This change adds four sources that have **no usable official API**: Goodreads (API shut down 2020), Amazon (PA-API needs an affiliate account with sales), and Google/Kindle image search. They must be reached by server-side HTML scraping. Two of them (Goodreads, Amazon) are full-metadata; two (Google Images, Kindle covers) are cover-only and keyed by title + author rather than ISBN.

## Goals / Non-Goals

**Goals:**
- Add `goodreads`, `amazon`, `googleimages`, `kindlecovers` as selectable sources in the existing enrich flow with minimal change to the established source model.
- Keep partial-failure tolerance and per-source caching, while making blocked/errored sources visible to the user (vs. a clean "no result").
- Preserve the cover-on-save download model and the manual, per-field adoption model (nothing auto-applies).

**Non-Goals:**
- Official/paid APIs (Amazon PA-API, licensed feeds).
- Non-US Amazon marketplaces (`.co.uk`, `.de`, …); US `amazon.com` only.
- Storing ASIN in the data model.
- Retry/backoff, proxy rotation, or headless-browser rendering to defeat bot-blocking.
- Auto-applying scraped values; everything remains a manual "Use" click.

## Decisions

### Server-side scraping with `cheerio`
Each new source is a fetcher that `fetch`es the relevant page with a browser-like `User-Agent`, loads the HTML into `cheerio`, and reads values via CSS selectors. `cheerio` is added as the single new runtime dependency. Alternative considered: regex extraction (no dep) — rejected as too brittle across four providers; `node-html-parser` — rejected for fewer selector features. Reusing existing `fetchWithTimeout` keeps the 20s timeout and abort behavior.

### Fetcher signature grows a query context
The cover-only image sources search by text, so the fetcher contract changes from `(isbn)` to a context carrying `{ isbn, title, author }`. ISBN-based sources ignore `title`/`author`; image sources require `title`. `GET /api/lookup/all` gains optional `title` and `author` params, which `EnrichPanel` populates from the edit form's current state (already in scope — the panel holds `current.title` and `current.authors`).

### Default vs. all source sets
`ALL_SOURCES` lists all six recognized ids; a new `DEFAULT_SOURCES = [google, openlibrary, goodreads, amazon]` is what the endpoint queries when `sources` is omitted and what the panel checks initially. The two cover-only image sources are opt-in because they are the most fragile and slowest. The route's existing `?? ALL_SOURCES` fallback becomes `?? DEFAULT_SOURCES`; validation still filters against `ALL_SOURCES`.

### Results + errors, with a three-way per-source outcome
`lookupAllSources` returns `{ results, errors }` instead of `LookupResult[]`. A fetcher distinguishes three outcomes:
- **result** — a normalized value (or, for cover-only sources, a result populated only with `cover_url`) → goes to `results` and is cached.
- **no-match** — connected fine but nothing found → returns `null`, omitted from both arrays, not cached.
- **error** — blocked (CAPTCHA / HTTP 403/429/503), timeout, or parse failure → throws a typed error; `lookupAllSources` collects it into `errors` as `{ source, reason }` and does not cache.

Existing `google`/`openlibrary` fetchers keep returning `null` on failure (treated as no-match), so their behavior is unchanged. Only the scrapers distinguish blocked-vs-empty.

### Cover-only result shape
Cover-only sources return a result with empty `title`/`authors`/`genres` and a populated `cover_url`. The panel already renders the cover section by filtering `r.cover_url` and shows fielded rows only when `displayValue` is non-empty, so a cover-only source naturally appears only in the cover picker — no UI special-casing needed.

### Identifier handling
- **Amazon**: book detail pages are addressed by ISBN-10. A small pure helper derives ISBN-10 from a `978`-prefixed ISBN-13 (drop prefix, recompute mod-11 check digit). `979`-prefixed ISBNs have no ISBN-10; those fall back to Amazon search by ISBN-13.
- **Goodreads**: located via Goodreads search by ISBN, following to the book page.
- **Image sources**: build a text query from `title` + `author` and read the first relevant image result.

### Caching
Reuse the existing per-source cache keyed by `{isbn}.{source}.json`. The enrich panel is already gated on ISBN presence (the panel hides/disables without an ISBN), so even title+author image scrapes occur in an ISBN context and have a stable cache key. Only results are cached (successes); no-match and errors are never cached, so a transient block does not poison the cache. `nocache` forces a refetch as today.

## Risks / Trade-offs

- **Bot-blocking** (Amazon, Google) → Scrapers frequently hit CAPTCHA/503. Mitigation: partial-failure tolerance means a blocked source is simply omitted; the new `errors` reporting tells the user it was blocked (vs. empty) so they understand the gap and can retry. Accepted as best-effort for a single-user self-hosted app.
- **Selector rot** → Provider HTML changes silently break parsers. Mitigation: each scraper degrades to "no-match" or "error" rather than crashing the endpoint; selectors are isolated per source for easy repair. No correctness impact on other sources.
- **Latency** → Six sequential-ish network calls; scrapers are slower than JSON APIs. Mitigation: all sources run in parallel; cover-only sources are off by default so routine fetches stay fast.
- **ToS / legality** → Scraping these sites may violate their terms. Mitigation: server-side, on-demand (only when the user clicks Fetch), single-user personal use, cached to minimize repeat requests; documented as out-of-scope to harden or scale.
- **New dependency** → `cheerio` is the first scraping dep, breaking the prior zero-scraping-deps stance. Accepted; it is the standard, well-maintained choice.

## Migration Plan

Additive and backward-compatible. No schema or data migration. New cache files coexist with existing ones. The `{ results, errors }` response shape adds a field; the only consumer is `EnrichPanel`, updated in the same change. Rollback is removing the new sources from `ALL_SOURCES`/`DEFAULT_SOURCES` and the panel list (the endpoint and cache remain valid).

## Open Questions

None — all resolved during the proposal interview (access method, provider roles, cover-source data paths, parser choice, default selection, field scope, failure visibility).
