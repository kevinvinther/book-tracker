## Why

The stats page shows incorrect numbers, buries the time-scoped figures, overflows vertically on genres, and offers no way to drill into the underlying books. The most glaring bug: under "This year" it reports 1,271 pages read but only 1.1 pages/day, because the pages-per-day denominator sums active days per read-through and counts unfinished read-throughs all the way to the end of the range — which for the current year is a future date (Dec 31) — inflating the denominator past 1,000 days.

## Supersedes

- **2026-06-19-statistics-backend**: Partly superseded. The pages-per-day definition (active days per read-through), the date-range edge behavior (date-only `to` treated as start-of-day, degenerate `from === to` skip), and the unfiltered rating breakdowns are replaced. Other reading/library/note computations carry forward.
- **2026-06-19-statistics-frontend**: Partly superseded. The three-section layout (Library → Reading → Notes), the four-option time-range selector, and the uncapped genre/series charts are replaced by a two-zone layout, an expanded preset set, and capped charts. Chart components and data-fetching carry forward.

## What Changes

- **Fix Pages/Day** — redefine `avg_pages_per_day` as pages read in range ÷ calendar days elapsed in the range, capped at today so a partially-elapsed range never divides by future days. For All time, the denominator runs from the earliest reading activity to today.
- **Consistent range scoping** — the average-rating breakdowns become range-scoped (rate read-throughs finished within the range). "Currently Reading" remains always-current. The UI visually distinguishes range-scoped stats from always-current ones.
- **Two-zone layout** — replace the Library/Reading/Notes sections with a top "This period" zone (all range-scoped stats, directly under the selector) and a "Library & all-time" zone below (snapshot stats). Always-current cards carry a "now" marker.
- **Expanded presets** — add Today, This week, Last week, This month, Last month alongside the existing This year / Last year / All time / Custom, ordered shortest→longest. **Default is This month.** Weeks start Monday; preset boundaries are computed in the browser's local time.
- **BREAKING (range semantics)** — the `to` bound becomes an inclusive end-of-day (`23:59:59.999`) everywhere, and the degenerate `from === to` skip is removed. This fixes single-day ranges (Today) and the existing Custom picker, where selecting the same start/end day currently shows nothing.
- **Cap long charts** — Works by Genre and Works by Series show the top 8, with a Show more / Show less toggle.
- **Click-through navigation** — Genre → `/library?genre=…`, Series → `/series/:slug`, rating-by-work & most-annotated → `/works/:slug`, rating-by-author → `/authors/:slug`. The library genre filter is fixed to match on the normalized genre so the stats slug links resolve. Copy-attribute charts (format/status/condition/language) are deferred to a GitHub issue.
- **New statistics** — a reading-velocity chart (pages read over time within the range) and an Unread/TBR count with "% of library read" in the snapshot zone.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `stats-api`: Pages-per-day denominator redefined to calendar days elapsed (capped at today; earliest-activity baseline for All time); `to` is inclusive end-of-day and the degenerate same-day skip is removed; average-rating breakdowns are range-scoped; new `reading.pages_per_period` time-series, `library.unread_count`, and `library.percent_read` fields.
- `stats-frontend`: Two-zone layout replacing the three sections; expanded preset set with This-month default and Monday-start local boundaries; top-8 cap with show-more on genre and series charts; click-through links from charts and ranked lists; visual distinction between range-scoped and always-current stats; reading-velocity and unread/TBR displays.
- `work-grid-page`: Genre filter reads the `?genre=` URL parameter on load and matches works by normalized genre, so normalized slug links from the stats page resolve correctly.

## Impact

- **Backend**: `server/src/routes/stats.ts` (range parsing, pages-per-day, rating scoping, new fields), `server/src/routes/stats.test.ts`.
- **Frontend**: `client/src/pages/Stats.tsx` (layout, presets, charts, links), `client/src/hooks/useStats.ts` (preset → range params, new fields), `client/src/pages/WorkGrid.tsx` (URL genre param + normalized matching), `client/src/lib/types.ts` (new stats fields).
- **External**: a GitHub issue tracking copy-attribute (format/status/condition/language) library filtering for future click-through support.
- No data-file or schema changes.
