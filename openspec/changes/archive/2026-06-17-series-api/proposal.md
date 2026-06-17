## Why

Series entities need a REST API so the frontend can create, browse, and manage book series, and so Works can link to them via wikilinks.

## What Changes

- New `POST /api/series` endpoint to create a Series entity file
- New `GET /api/series` endpoint to list all series
- New `GET /api/series/:slug` endpoint to return a single series with its works resolved in `series_position` order
- New `PATCH /api/series/:slug` endpoint to update `name` and `total_works`
- New `DELETE /api/series/:slug` endpoint with orphan protection (refuse if works link to this series; cascade clears the series link from those works)
- New route file `server/src/routes/series.ts` registered in `server/src/index.ts`
- Tests in `server/src/routes/series.test.ts`

## Capabilities

### New Capabilities

- `series-api`: Full CRUD REST API for Series entities, including orphan-protected delete with cascade that removes the series link from all linked Works

### Modified Capabilities

(none)

## Impact

- New file: `server/src/routes/series.ts`
- New file: `server/src/routes/series.test.ts`
- Modified: `server/src/index.ts` (route registration)
- The cascade DELETE path reads and rewrites Work files — touches the same Work files the Work API owns, but only to clear `series` and `series_position` fields
