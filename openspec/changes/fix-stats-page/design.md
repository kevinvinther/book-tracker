## Context

The stats page (`/stats`) is a read-only dashboard fed by `GET /api/stats`. The backend computes library, reading, and note statistics from the in-memory index with no disk reads. The frontend (`client/src/pages/Stats.tsx`) renders three sections and a four-option time-range selector.

Three structural problems motivate this change:

1. **Wrong pages-per-day.** `avg_pages_per_day = total_pages_read / total_active_days`, where `total_active_days` sums `activeDaysInRange` *per read-through* and, for unfinished read-throughs, uses the range's `to` as the end. For "This year" `to` is `2026-12-31`, a future date, so each in-progress read-through contributes ~180+ days, and several read-throughs sum past 1,000 days. Pages/day collapses to ~1.1.
2. **Inconsistent range scoping.** `finished_count`, `total_pages_read`, and `copies_acquired` respect the range; `currently_reading_count` and the rating breakdowns ignore it. Under a time filter the numbers look contradictory.
3. **Range boundary bugs.** `parseDateInput` maps a date-only `to` to `T00:00:00`, excluding that whole day, and the handler skips all reading stats when `from === to` (stats.ts:176). A single-day preset like "Today" would show nothing.

Constraints: markdown + YAML data store, no database; stats computed in-memory; frontend is React + Vite + TS + Tailwind + recharts.

## Goals / Non-Goals

**Goals:**
- Correct, intuitive Pages/Day across every preset including All time and single-day ranges.
- One consistent rule for what "range-scoped" means, surfaced visually.
- A two-zone layout that puts time-scoped stats first.
- Bounded chart height for genre and series.
- Click-through from charts to the relevant library/detail pages.
- Two new high-signal stats: reading velocity over time, and unread/TBR with % read.

**Non-Goals:**
- New library filtering for copy attributes (format/status/condition/language) — deferred to a GitHub issue.
- Reading streaks.
- Prettifying genre slug labels.
- Any change to the markdown/YAML data schema.

## Decisions

### Pages/Day = pages in range ÷ calendar days elapsed (capped at today)

Replace `total_active_days` entirely. The denominator is the number of calendar days in the effective range, but never counting days beyond today.

- Bounded preset (Last year, Last month, a fully-past Custom): full day span of the range.
- Partially-elapsed preset (This year, This month, This week, Today): `from` → `min(to, today-end)`.
- **All time** (no range): from the earliest reading activity (earliest `page_log` entry date across all read-throughs; fall back to earliest `started_date`) to today.

Day count uses floor-to-UTC-day arithmetic consistent with the existing `activeDaysInRange` helper, with a minimum of 1 day to avoid divide-by-zero on same-day ranges. `pages_per_day = round(pages_in_range / days_elapsed, 1)`.

*Alternative considered:* active reading days (days with a log entry). Rejected — the user wants the intuitive "pages per calendar day" number, and active-days hides idle time.

### `to` is an inclusive end-of-day; remove the `from === to` skip

`parseDateInput` keeps date-only `from` at `T00:00:00.000Z` but maps date-only `to` to `T23:59:59.999Z`. Full-ISO inputs (sent by the new local-time presets) pass through unchanged. The `if (range.from === range.to) continue;` guard is deleted; with end-of-day handling the bound is never degenerate, and `pagesReadInRange` / overlap checks already behave correctly for short ranges.

This is a behavior change for existing Custom ranges (the end day is now included), which is the intuitive reading and was confirmed.

### Presets computed in the browser's local time

`useStats` gains a preset → params translation. Today/This week/This month/Last week/Last month are computed from the local clock and sent as full-ISO `from`/`to` timestamps (`new Date(...).toISOString()`), so "today" tracks the user's local day, not a UTC day. Weeks start Monday (ISO 8601). This year / Last year continue to send `?year=`; All time sends `?year=all`. Default preset is **This month**.

*Alternative considered:* compute boundaries server-side from a preset name. Rejected — the server has no knowledge of the client's timezone; sending resolved ISO timestamps keeps the API timezone-agnostic and the contract unchanged.

### Range-scoping rule and visual distinction

A stat is **range-scoped** if it answers "in this period": finished count, pages read, pages/day, copies acquired, average ratings (now scoped to read-throughs finished in range), reading velocity, notes in period. A stat is **always-current** if it answers "right now": library totals and breakdowns, currently reading, unread/TBR, % read, all-time most-annotated.

Layout encodes the split into two zones — "This period" (top, under the selector) and "Library & all-time" (below). Always-current cards inside or near the period zone carry a small "now" marker so the distinction survives even when cards sit close together.

### Reading velocity series

Backend adds `reading.pages_per_period`: an ordered list of `{ period, pages }` buckets of page-log deltas within the range. Bucket granularity is derived from the range span: daily for ranges up to ~62 days (Today, This/Last week, This/Last month), weekly up to ~1 year, monthly beyond (incl. All time). Today yields a single bucket; the chart still renders one bar. The frontend renders it as a bar chart in the period zone.

### Unread/TBR and % read

Backend adds `library.unread_count` = copies with status `owned` or `lent` and zero read-throughs, and `library.percent_read` = works with ≥1 `finished` read-through ÷ total works (0 when no works). Both are always-current snapshot figures.

### Click-through and the genre normalization fix

Charts and ranked lists become links: genre bar → `/library?genre=<normalized-slug>`, series → `/series/:slug`, rating-by-work and most-annotated → `/works/:slug`, rating-by-author → `/authors/:slug`. The stats `works_by_genre` keys are normalized slugs, but `WorkGrid` currently filters raw `work.genres`. `WorkGrid` is changed to (a) seed the active filter from the `?genre=` URL param on load and (b) match via `normalizeGenre(workGenre) === normalizeGenre(param)`, so both the normalized slug links and the existing raw chip values resolve. The client reuses the server's normalization logic (lowercase, trim, spaces → hyphens) to avoid coupling to the `limax` slug library; a small shared helper is acceptable.

## Risks / Trade-offs

- **Custom end-day inclusivity changes existing behavior** → confirmed as intended; documented in the spec scenario so it's an explicit contract, not a silent shift.
- **Client/server genre normalization drift** → the server uses `limax`; a hand-rolled client normalizer could diverge on exotic characters. Mitigation: the realistic genre set is plain ASCII words; normalized matching only needs lowercase/trim/space→hyphen, and a mismatch degrades to "no results", not a crash.
- **Velocity bucket count on All time** → monthly buckets over many years could be wide but bounded; acceptable, and the chart is horizontally scaled by recharts.
- **Local-time presets vs UTC-stored dates** → a read logged late at night could land in an adjacent UTC day. Acceptable for a personal single-user diary; consistent with how the year preset already uses the local clock.

## Migration Plan

Pure additive API fields plus changed computation; no data migration. Deploy backend and frontend together (the new fields and the inclusive-`to` semantics are consumed by the updated frontend). Rollback is a straight revert — no persisted state changes. The GitHub issue for copy-attribute filtering is filed as part of this change but implemented later.
