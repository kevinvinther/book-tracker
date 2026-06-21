## ADDED Requirements

### Requirement: Get series with enriched work metadata
`GET /api/series/:slug` SHALL, for each work in the resolved `works` array, additionally include `authors_meta` (array of `{ slug, name }`), `primary_cover`, `edition_count`, and `copy_count` resolved from the in-memory index. The existing `slug`, `title`, and `series_position` fields SHALL remain present. Works SHALL remain ordered by `series_position` ascending, with unpositioned works last.

#### Scenario: Series with works that have authors and covers
- **WHEN** a GET request is made to `/series/dune-chronicles` with 2 linked works
- **THEN** each element in the `works` array contains `slug`, `title`, `series_position`, `authors_meta` (array of `{ slug, name }`), `primary_cover`, `edition_count`, and `copy_count`

#### Scenario: Series work with no cover
- **WHEN** a work linked to the series has no `primary_cover`
- **THEN** the work entry's `primary_cover` is `null`

#### Scenario: Series with no works
- **WHEN** a GET request is made to `/series/empty-series` with no linked works
- **THEN** the `works` array is empty
