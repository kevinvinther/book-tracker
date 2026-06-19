## 1. Route file and time range parsing

- [x] 1.1 Create `server/src/routes/stats.ts` with factory function `createStatsRouter(index, libraryPath)` returning an Express Router
- [x] 1.2 Implement `parseDateRange(query)` helper that accepts `?year=`, `?from=&to=`, or `?year=all` and returns `{ from, to } | null`
- [x] 1.3 Validate date parameters: reject conflicting params (year + from/to) with 400, reject malformed dates with 400, reject `from > to` with 400
- [x] 1.4 Mount router at `/api/stats` in `server/src/index.ts`

## 2. Library snapshot computation

- [x] 2.1 Compute total works, editions, copies from index
- [x] 2.2 Compute copies_by_format map (omit copies with no format)
- [x] 2.3 Compute copies_by_status map
- [x] 2.4 Compute copies_by_condition map (omit copies with no condition)
- [x] 2.5 Compute works_by_genre map (a work counts under each genre it has)
- [x] 2.6 Compute works_by_language map (omit works with no language)
- [x] 2.7 Compute works_by_series map (only works with a series link)

## 3. Reading statistics computation

- [x] 3.1 Implement `isReadThroughInRange(rt, from, to)` helper: true if `started_date <= to` AND (no finished_date OR `finished_date >= from`)
- [x] 3.2 Compute finished_count: count read-throughs with `status: finished` and `finished_date` in range
- [x] 3.3 Compute currently_reading_count: count read-throughs with `status: reading` (unfiltered by date range)
- [x] 3.4 Compute total_pages_read: sum page deltas from page_log entries whose date falls in range, per qualifying read-through
- [x] 3.5 Compute avg_pages_per_day: total_pages_read / sum of active days per qualifying read-through in range (clipped to range bounds; return 0 if no active days)
- [x] 3.6 Compute avg_rating_by_work: for each work, average `rating` from all copies' read-throughs that have a rating, with `read_through_count` of rated read-throughs
- [x] 3.7 Compute avg_rating_by_author: same logic aggregated per author (resolving author slugs from work wikilinks)
- [x] 3.8 Compute copies_acquired: count copies with `acquisition_date` in range

## 4. Note statistics computation

- [x] 4.1 Build a `Map<workSlug, Note[]>` by iterating all notes once, extracting work slug from wikilink, and grouping
- [x] 4.2 Compute total_notes: count notes with `date` in range
- [x] 4.3 Compute notes_per_month: group notes by YYYY-MM of their date
- [x] 4.4 Compute most_annotated_works: from the note-to-work map, sort works by note count descending, return with title and slug, capped at `?limit=` (default 10)

## 5. Response assembly

- [x] 5.1 Assemble the categorized `{ range, library, reading, notes }` response
- [x] 5.2 Ensure empty datasets return zeros, empty maps, and empty lists (no 404 or errors)

## 6. Tests

- [x] 6.1 Create `server/src/routes/stats.test.ts` with test fixtures (works, editions, copies with read-throughs, notes)
- [x] 6.2 Test: empty library returns zeros and empty structures
- [x] 6.3 Test: library snapshot breakdowns match fixture data
- [x] 6.4 Test: reading stats with in-range, out-of-range, and spanning read-throughs
- [x] 6.5 Test: pages read only counts deltas in range
- [x] 6.6 Test: pages per day with active day clipping
- [x] 6.7 Test: average ratings by work and author, excluding unrated
- [x] 6.8 Test: note stats with date filtering, monthly grouping, and most-annotated limit
- [x] 6.9 Test: parameter validation (conflicting params, bad dates, from > to)
- [x] 6.10 Test: `?year=all` returns all-time stats
- [x] 6.11 Run tests to verify all pass
