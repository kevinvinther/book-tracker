> ⚠️ **Superseded by [`fix-stats-page`](../../2026-06-30-fix-stats-page/proposal.md)** (archived 2026-06-30)
>
> The three-section layout (Library → Reading → Notes), the four-option time-range selector, and the uncapped genre/series charts were replaced by a two-zone layout, an expanded preset set, and capped charts. Chart components and data-fetching carry forward.

---

## Supersedes

None.

## Why

The backend computes library-wide statistics (copies by format, pages read, notes per month, average ratings) — but users have no way to see any of it. The app is a ledger without a dashboard. A stats page turns accumulated data into insight, letting users browse their library's composition and their reading patterns at a glance.

## What Changes

- New `/stats` page in the client with recharts-powered visualizations
- New `useStats` hook that fetches from `GET /api/stats` and includes the existing hook pattern (loading/error/refetch states)
- Client-side TypeScript types for the stats response shape
- Time range selector: This Year / Last Year / All Time / Custom (native date inputs)
- Library snapshot section: metric cards (works, editions, copies) + bar charts for breakdowns by format, status, condition, edition language, original language, genre, and series
- Reading stats section: metric cards (finished, reading, pages, pages/day, copies acquired) + horizontal bar charts for average rating by work and by author
- Notes stats section: metric card (total notes) + bar/line chart for notes per month + ranked list of most-annotated works
- Series slug-to-name resolution via `GET /api/series`; language code display via inline lookup table (ISO 639-1 and ISO 639-2/B)
- `original_language` field added to the Edit Work modal so users can populate it
- "Stats" link added to the header navigation, next to Settings
- recharts added as a new client dependency
- Backend fix: `copies_by_format` now resolves from `edition.format` (was incorrectly reading a non-existent `copy.format`)
- Backend addition: new `copies_by_language` field in stats response, resolved from `edition.language` per copy

## Capabilities

### New Capabilities

- `stats-frontend`: Dashboard page at `/stats` that visualizes library, reading, and note statistics from the existing `GET /api/stats` endpoint using metric cards, recharts bar/line charts, and ranked lists. Includes a time range selector (year/all-time/custom), resolves series slugs and language codes to human-readable names, and shows both edition language (copies) and original language (works). A new `original_language` input in the Edit Work modal lets users populate the works-by-original-language chart.

### Modified Capabilities

None.

## Impact

- **New file**: `client/src/pages/Stats.tsx` — the stats dashboard page component
- **New file**: `client/src/hooks/useStats.ts` — data-fetching hook for `/api/stats`
- **New file**: `client/src/components/MetricCard.tsx` — reusable metric card component
- **New file**: `client/src/components/ChartContainer.tsx` — chart wrapper with heading and empty state
- **New file**: `client/src/lib/languages.ts` — ISO 639-1/2 language code lookup table
- **Modified**: `client/src/lib/types.ts` — new `StatsResponse` interface with `copies_by_language`
- **Modified**: `client/src/App.tsx` — add `/stats` route + header nav link
- **Modified**: `client/src/components/EditWorkModal.tsx` — add `original_language` input field
- **Modified**: `server/src/routes/stats.ts` — fix `copies_by_format` to use edition, add `copies_by_language`
- **Modified**: `server/src/routes/stats.test.ts` — update test fixtures and expectations
- **New dependency**: `recharts` (added to `client/package.json`)
