## ADDED Requirements

### Requirement: Get author with enriched work metadata
`GET /api/authors/:slug` SHALL, for each work in the resolved `works` array, additionally include `primary_cover`, `edition_count`, and `copy_count` resolved from the in-memory index. The existing `slug` and `title` fields SHALL remain present. Works SHALL be sorted alphabetically by `title` ascending.

#### Scenario: Author with works that have covers and counts
- **WHEN** a GET request is made to `/api/authors/fyodor-dostoevsky` and the author has 2 works, one with a cover and one with editions
- **THEN** each element in the `works` array contains `slug`, `title`, `primary_cover` (string or null), `edition_count` (number), and `copy_count` (number)

#### Scenario: Author with a work that has no cover
- **WHEN** a work linked to the author has no `primary_cover` field
- **THEN** the work entry's `primary_cover` is `null`

#### Scenario: Author with no works
- **WHEN** a GET request is made to `/api/authors/unlinked-author` who has zero linked works
- **THEN** the `works` array is empty
