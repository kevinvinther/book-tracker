## Context

The Work, Author, Edition, and Copy APIs established the CRUD pattern: Express Router factory `createXxxRouter(index, libraryPath)`, in-memory `Index` class, atomic `writeFile`, and a global slug namespace. Series is the last pure-backend entity API before frontend work begins.

Series entities are stored at `series/{slug}.md`. Works link to a series via `series: "[[series/{slug}]]"` and optionally `series_position: <number>` in their frontmatter.

The Index already has `getAllSeries()`, `getSeries(slug)`, `upsert`, and `remove` but no `getWorksBySeries(seriesSlug)` — that method needs to be added.

## Goals / Non-Goals

**Goals:**
- Full CRUD for Series entities following the established router factory pattern
- `GET /api/series/:slug` returns the series with a `works` array resolved from the index, sorted by `series_position`
- `DELETE` with orphan protection: refuses if works link to the series; `?cascade=true` removes `series` and `series_position` from those Work files and the index
- New `index.getWorksBySeries(slug)` method

**Non-Goals:**
- Changing series or series_position on Work via the Series API (that's the Work API's responsibility)
- Placeholder slots for `total_works` (the list only includes works actually in the library)

## Decisions

**Add `getWorksBySeries` to Index** — Consistent with `getWorksByAuthor` and `getEditionsByWork`. Filters `getAllWorks()` by `series === "[[series/{slug}]]"`. Simple linear scan over the works map; fine for the expected library size.

**Cascade DELETE rewrites Work files** — On `?cascade=true`, for each linked work: re-read file, delete `series` and `series_position` keys from frontmatter, write back, upsert into index. Similar in spirit to the author cascade in the author API, except the author cascade in the current code does NOT actually modify works — the series cascade actively clears the fields, since dangling `series` wikilinks would break Obsidian navigation.

**No `?force=true` mode** — Unlike the edition API, series delete only needs orphan-protect and cascade. A "force" mode that leaves dangling `[[series/slug]]` wikilinks in Works would break Obsidian navigation.

**Slug from name** — Same as author: `generateSlug(name, getAllSlugs(index))`.

**`GET /api/series/:slug` includes `works` sorted by `series_position`** — Works without a `series_position` sort last (treated as `Infinity`). This matches what the upcoming Series Detail frontend page will need.

## Risks / Trade-offs

- **Cascade rewrites Work files directly** — if the process crashes mid-cascade, some works will have had their series link removed and others won't. Acceptable for now; atomic per-file writes minimise the damage window. No transactional guarantees at this stage.
- **Works with null `series_position`** sort as `Infinity`, so they appear after positioned works. This is a pragmatic default.
