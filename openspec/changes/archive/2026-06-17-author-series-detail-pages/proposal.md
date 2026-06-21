## Why

The Work Detail page already links to author and series pages (`/authors/:slug`, `/series/:slug`), but those routes don't exist yet. Without them, the author and series links in Work Detail are dead ends rather than useful navigation hubs. Author Detail and Series Detail are the next logical pages after the Work Grid and Work Detail — they complete the core browsing experience.

## What Changes

- New Author Detail page (`/authors/:slug`): author name + aliases, list of works with thumbnail/title/copy count/aggregate read status, sorted by most recently interacted-with, edit button
- New Series Detail page (`/series/:slug`): series name, ordered work list by `series_position` with title + read status, placeholders for books not yet in library (if `total_works` is set), edit button
- `GET /api/authors/:slug` extended to resolve works with their `copy_count`, `edition_count`, and `primary_cover` inline, avoiding N+1 frontend requests
- `GET /api/series/:slug` extended to resolve each work's `authors_meta`, `primary_cover`, `edition_count`, and `copy_count` inline

## Capabilities

### New Capabilities
- `author-detail-page`: Full Author detail view — name, aliases, list of works with cover thumbnails and metadata, edit button
- `series-detail-page`: Full Series detail view — name, ordered work list by series position, placeholders for upcoming books, edit button

### Modified Capabilities
- `author-api`: `GET /api/authors/:slug` additionally resolves each linked work's `copy_count`, `edition_count`, and `primary_cover`
- `series-api`: `GET /api/series/:slug` additionally resolves each linked work's `authors_meta`, `primary_cover`, `edition_count`, and `copy_count`

## Impact

- New files: `client/src/pages/AuthorDetail.tsx`, `client/src/pages/SeriesDetail.tsx`
- New hooks: `client/src/hooks/useAuthor.ts`, `client/src/hooks/useSeries.ts`
- `client/src/App.tsx` — add `/authors/:slug` and `/series/:slug` routes
- `server/src/routes/authors.ts` — extend `GET /:slug` handler to resolve work metadata
- `server/src/routes/series.ts` — extend `GET /:slug` handler to resolve work metadata
- New types in `client/src/lib/types.ts`: `Author` and `Series`
