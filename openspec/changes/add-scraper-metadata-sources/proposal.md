## Why

The dedicated edit pages added a multi-source enrich panel, but deliberately left it limited to two clean JSON APIs (Google Books, Open Library) and named Amazon, Goodreads, Google Images, and Kindle covers as an explicit non-goal for a separate spec. This is that spec. Calibre-style curation wants as many sources as possible so the user can pick the best value for each field — especially covers, where the two existing sources are often low-resolution or missing.

## Supersedes

None. This change extends `2026-06-27-enrich-edit-pages` — it adds sources to that change's `multi-source-lookup` capability and surfaces them in its enrich panel, without replacing any existing behaviour. The `GET /api/lookup` single-result endpoint and the Google Books / Open Library sources are untouched.

## What Changes

- Add four new metadata sources to `GET /api/lookup/all`, all scraped server-side with a new `cheerio` HTML parser (no official APIs exist for any of them):
  - **Goodreads** — full-metadata + cover scraper, default-ON.
  - **Amazon** (amazon.com / US) — full-metadata + cover scraper, default-ON.
  - **Google Images** — cover-only, scraped from an image search by title + author, default-OFF (opt-in).
  - **Kindle covers** — cover-only, scraped from an Amazon Kindle-store image search by title + author, default-OFF (opt-in).
- **Scrapers extract best-effort**: every field a page exposes (title, subtitle, authors, publisher, publish_date, page_count, format, language, description, genres, cover). Because adoption is manual per-field, noisy values (e.g. Goodreads shelf "genres") are simply never adopted; existing genre normalization cleans the rest.
- `GET /api/lookup/all` gains optional `title` and `author` query parameters, used by the title+author image scrapers. **BREAKING** (additive-compatible) to the response: it now returns `{ results, errors }`, where `errors` is a list of `{ source, reason }` for sources that were blocked or errored, so the panel can distinguish "blocked" from "found nothing".
- Split the source sets: a new `DEFAULT_SOURCES` (google, openlibrary, goodreads, amazon) is queried when the `sources` param is omitted; `ALL_SOURCES` additionally includes the two cover-only sources, which are opt-in.
- The enrich panel (`EnrichPanel`) lists all six sources (four checked, two unchecked by default), passes the current title + author to the endpoint, and renders a per-source "blocked / failed" note for sources reported in `errors`.

## Capabilities

### New Capabilities
- `scraper-metadata-sources`: Server-side scrapers for Goodreads, Amazon, Google Images, and Kindle covers — how each is reached, what it extracts, identifier handling (ISBN-10 derivation, title+author search), failure classification, and that cover-only sources populate only a cover URL.

### Modified Capabilities
- `multi-source-lookup`: The endpoint gains `title`/`author` params, the four new sources, a `DEFAULT_SOURCES` vs `ALL_SOURCES` split, and an `errors` array in the response for blocked/errored sources.
- `edition-edit-page`: The enrich panel surfaces the six sources with the new default selection, passes title+author, and shows per-source failure notes.

## Impact

- Server: extends `server/src/lib/lookup.ts` (new fetchers, `SourceId`/`source` union, `DEFAULT_SOURCES`, `lookupAllSources` returning results + errors) and `server/src/routes/lookup.ts` (`title`/`author` params, `{ results, errors }` response). Reuses existing per-source cache (`{isbn}.{source}.json`, successes only) and `downloadCover`-on-save flow unchanged.
- New runtime dependency: `cheerio`. New utility: ISBN-13 → ISBN-10 derivation for Amazon `/dp/` lookups, and a browser-like `User-Agent` for scrape requests.
- Client: `EnrichPanel.tsx` source list, default selection, title+author params, and failure notes. `SourceLookupResult.source` / lookup types extend to the four new ids.
- No schema or data-model changes. No ASIN storage. Amazon limited to the US marketplace; non-US marketplaces, retries/proxies, and official APIs are out of scope.
