## 1. Backend: range parsing

- [x] 1.1 In `server/src/routes/stats.ts`, make `parseDateInput` resolve a date-only `to` to `T23:59:59.999Z` and a date-only `from` to `T00:00:00.000Z`; honor full ISO timestamps unchanged
- [x] 1.2 Thread a separate `from`/`to` resolution so `parseDateRange` applies end-of-day to `to` for custom ranges (year range already uses `23:59:59.999`)
- [x] 1.3 Remove the `if (range.from === range.to) continue;` skip in the reading loop

## 2. Backend: pages-per-day fix

- [x] 2.1 Delete `total_active_days`/`activeDaysInRange` usage; compute the denominator as calendar days between `from` and `min(to, end-of-today)`
- [x] 2.2 For `?year=all`, derive the baseline from the earliest page-log entry date (fallback earliest `started_date`) to today
- [x] 2.3 Clamp the day count to a minimum of 1 and round `avg_pages_per_day` to one decimal

## 3. Backend: range-scoped ratings

- [x] 3.1 Only include a read-through in `avg_rating_by_work`/`avg_rating_by_author` when its `finished_date` is within range (all rated read-throughs under `?year=all`)

## 4. Backend: new fields

- [x] 4.1 Add `library.unread_count` (copies with status `owned`/`lent` and zero read-throughs)
- [x] 4.2 Add `library.percent_read` (works with ≥1 `finished` read-through ÷ total works × 100, 0 when no works)
- [x] 4.3 Add `reading.pages_per_period`: bucket in-range page deltas (daily ≤~62d, weekly ≤~1y, monthly beyond / all-time), ordered chronologically
- [x] 4.4 Update the response shape and any response typing

## 5. Backend: tests

- [x] 5.1 Update/add `stats.test.ts` cases for inclusive `to`, single-day range, pages-per-day (past, partially-elapsed, all-time, min-1-day), range-scoped ratings, `unread_count`, `percent_read`, and `pages_per_period`

## 6. Frontend: types and hook

- [x] 6.1 Add `unread_count`, `percent_read`, and `pages_per_period` to the stats types in `client/src/lib/types.ts`
- [x] 6.2 In `useStats.ts`, add the preset → params mapping (local-time, Monday-start boundaries for Today/This/Last week/This/Last month; `?year=` for This/Last year; `?year=all` for All time) sending full-ISO `from`/`to`

## 7. Frontend: selector and layout

- [x] 7.1 Expand `TimeRangeSelector` to the nine presets ordered shortest→longest; default state to `this-month`
- [x] 7.2 Restructure `Stats.tsx` into a "This period" zone (finished, pages read, pages/day, acquired, ratings, reading velocity, total notes, notes-per-month) and a "Library & all-time" zone (totals, unread/TBR, % read, breakdowns, currently reading, most-annotated)
- [x] 7.3 Add a "now" marker / distinct styling to always-current cards (Currently Reading, Unread, % read)

## 8. Frontend: charts

- [x] 8.1 Add the reading-velocity bar chart bound to `pages_per_period`
- [x] 8.2 Cap Works by Genre and Works by Series to top 8 with a Show more/Show less toggle (no toggle when ≤8)
- [x] 8.3 Add Unread/TBR and "% read" metric cards

## 9. Frontend: click-through

- [x] 9.1 Wrap genre bars → `/library?genre=<normalized>`, series bars → `/series/:slug`, rating-by-work & most-annotated → `/works/:slug`, rating-by-author → `/authors/:slug`; keep copy-attribute charts non-clickable
- [x] 9.2 In `WorkGrid.tsx`, seed the genre filter from the `?genre=` URL param and match works via normalized-genre comparison (lowercase/trim/space→hyphen), so normalized slugs and raw chip values both resolve

## 10. Deferred work tracking

- [x] 10.1 File a GitHub issue for copy-attribute (format/status/condition/language) library filtering to enable those click-throughs later (kevinvinther/book-tracker#9)

## 11. Verification

- [x] 11.1 Run server and client test suites; lint/typecheck
- [x] 11.2 Manually verify each preset (esp. Today and This month), pages/day sanity, click-throughs, and the genre/series Show more toggles
      - Verified against real data via the API: this-year pages/day 5.3 (was 1.1), all-time baseline 45.4, single-day "today" inclusive with no skip, new unread/percent/velocity fields populate. Browser-driven click-through and Show more toggles are wired + type-checked but not exercised in a live browser.
