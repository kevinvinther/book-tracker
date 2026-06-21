## Context

The in-memory index already holds every entity — all copies, editions, works, notes, series, and authors — parsed at startup. Stats are computed live from these in-memory collections on each request. No disk reads, no persistent aggregation.

The endpoint follows the existing route factory pattern: a function `createStatsRouter(index, libraryPath)` that receives the index and returns an Express `Router`. It mounts at `/api/stats` in `server/src/index.ts`.

## Goals / Non-Goals

**Goals:**
- Single `GET /api/stats` endpoint that returns categorized library, reading, and note statistics
- Time-range scoping via `?year=`, `?from=&to=`, or `?year=all`
- All data values come from the in-memory index — zero disk I/O
- Follow existing route conventions (factory function, error handling pattern)

**Non-Goals:**
- Frontend dashboard page (separate change)
- Caching or persistent stat storage (in-memory computation is fast enough for local use)
- Time-series data (e.g., "reading pace over time" chart data)
- Export or CSV generation of stats
- Computed stats beyond what's in the spec: library snapshot, reading stats, note stats

## Decisions

### 1. Time range parsing

Accept three mutually-exclusive parameter patterns:

| Parameters | Meaning |
|---|---|
| `?year=2025` | Jan 1 – Dec 31 of that year (UTC) |
| `?from=2025-01-01&to=2025-03-31` | Custom inclusive date range |
| `?year=all` (or no params) | All-time, no date filter |

Validation: reject if both `year` and `from`/`to` are provided. Reject if `from` > `to`. Reject malformed date strings.

**Why not ISO 8601 ranges?** `from`/`to` are simpler to type and parse than a combined range parameter. Follows common REST conventions.

### 2. Read-through date scoping

A read-through "belongs" to a date range if its activity window overlaps the range:

```
started_date ≤ rangeEnd  AND  (finished_date == null  OR  finished_date ≥ rangeStart)
```

This includes:
- Read-throughs that started before the range but continue into it
- Read-throughs that started within the range
- Read-throughs that started and finished within the range
- Active read-throughs (no finished_date) that started before or during the range

### 3. Pages read calculation

Only count page deltas whose `date` falls within the range. For each qualifying read-through, sum `page_log[i].page - page_log[i-1].page` for all entries where `page_log[i].date` is in range. Include the baseline entry (page 0) if it falls in range — it contributes 0 pages but anchors the first real delta.

**Not** max(page_log.page) per read-through — that would credit a 2024→2025 spanning read-through for all 500 pages in both years. Counting only deltas logged during the period gives accurate per-period accounting.

### 4. Average pages per day

```
total pages in range / sum of active days per read-through in range
```

For each qualifying read-through, active days = `(min(finished_date || now, rangeEnd) - max(started_date, rangeStart))` in days. Returns 0 if no active days.

**Why not total pages / calendar days?** A user who reads for 30 days in a year should see ~20 pages/day, not ~2 pages/day divided by 365. The active-days denominator reflects actual reading effort.

### 5. Single-pass computation

Walk all entities once, building all aggregations simultaneously:

```
for each copy:
  - increment format/status/condition counts
  - check acquisition_date against range
  - for each read_through:
    - check if in range → accumulate reading stats
  - for each note (via getNotesByCopy):
    - check date against range → accumulate note stats

for each work:
  - increment genre/language/series counts
  - aggregate ratings from its copies' read-throughs
```

This avoids multiple O(n) passes over the same data. The index's `getNotesByCopy()` does a filter over all notes per copy, which is inefficient if called per-copy for hundreds of copies. Instead, iterate notes once and join to copies by wikilink.

### 6. Response shape

```json
{
  "range": { "from": "2025-01-01", "to": "2025-12-31" },
  "library": {
    "total_works": 42,
    "total_editions": 56,
    "total_copies": 67,
    "copies_by_format": { "paperback": 30, "hardcover": 20, ... },
    "copies_by_status": { "owned": 50, "lent": 5, ... },
    "copies_by_condition": { "good": 40, "worn": 10, ... },
    "works_by_genre": { "fiction": 25, "classic": 10, ... },
    "works_by_language": { "en": 30, "ru": 5, ... },
    "works_by_series": { "the-dark-tower": 3, ... }
  },
  "reading": {
    "finished_count": 12,
    "currently_reading_count": 3,
    "total_pages_read": 4500,
    "avg_pages_per_day": 22.5,
    "avg_rating_by_work": [
      { "slug": "dune", "title": "Dune", "avg_rating": 9.2, "read_through_count": 2 }
    ],
    "avg_rating_by_author": [
      { "slug": "frank-herbert", "name": "Frank Herbert", "avg_rating": 9.0, "read_through_count": 3 }
    ],
    "copies_acquired": 8
  },
  "notes": {
    "total_notes": 45,
    "notes_per_month": { "2025-01": 4, "2025-02": 7, ... },
    "most_annotated_works": [
      { "slug": "dune", "title": "Dune", "note_count": 12 }
    ]
  }
}
```

The `range` field reflects the effective range used (for all-time, it is omitted or null).

### 7. Configuration

`?limit=` parameter defaults to 10, controls the max entries in `most_annotated_works`. No max enforcement on the server side — the client can request any positive integer.

## Risks / Trade-offs

- **O(n) over all entities on every request.** For libraries under 10,000 books this is sub-millisecond in memory. A local-only app won't see enough traffic to need caching. If this ever becomes slow, the stats could be computed lazily and memoized with an index version key.

- **Notes-by-copy join is O(n×m).** Rather than calling `getNotesByCopy()` per copy (which filters all notes each time), the implementation should build a `Map<copySlug, Note[]>` in one pass for O(n+m) efficiency.

- **Empty datasets.** A fresh library has no data. All counts should return 0, maps should return `{}`, lists should return `[]`. No error states for empty libraries.
