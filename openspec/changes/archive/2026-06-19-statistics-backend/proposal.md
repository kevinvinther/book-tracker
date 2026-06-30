> ⚠️ **Superseded by [`fix-stats-page`](../../2026-06-30-fix-stats-page/proposal.md)** (archived 2026-06-30)
>
> The pages-per-day definition (active days per read-through), the date-range edge behavior (date-only `to` treated as start-of-day and the degenerate `from === to` skip), and the unfiltered rating breakdowns were replaced. Other reading/library/note computations carry forward.

---

## Supersedes

None.

## Why

Users can catalog their library, track reading progress, and write notes — but they have no dashboard to see their library and reading activity at a glance. Without statistics, the app is a ledger without a summary page.

## What Changes

- New `GET /api/stats` endpoint that computes library and reading statistics entirely from the in-memory index (no disk reads)
- Supports time-range scoping via `?year=`, `?from=&to=`, or `?year=all` query parameters
- Provides three categorized stat groups: library snapshot, reading stats, and note stats
- Configurable `?limit=` for paginated lists like "most-annotated works"

## Capabilities

### New Capabilities
- `stats-api`: Read-only REST endpoint computing library snapshot (totals, breakdowns by format/status/condition/genre/language), reading stats (finished count, pages read, pages/day, ratings by work and author, copies acquired), and note stats (total, per month, most-annotated works). All calculations run against the in-memory index.

### Modified Capabilities
None.

## Impact

- **New route file**: `server/src/routes/stats.ts` — exported `createStatsRouter()` mounted at `/api/stats` in `server/src/index.ts`
- **New test file**: `server/src/routes/stats.test.ts` — integration tests verifying stat calculations against fixture data
- **Index**: Read-only access to existing data via `Index` class; no new query methods needed
- **Types**: No new types required; response shape defined inline in the route handler
- **Client**: No changes in this change (frontend dashboard comes later)
