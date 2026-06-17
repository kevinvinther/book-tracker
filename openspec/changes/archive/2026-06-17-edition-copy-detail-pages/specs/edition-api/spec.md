## ADDED Requirements

### Requirement: Get edition with resolved work metadata
`GET /api/editions/:slug` SHALL resolve `work_meta` from the in-memory index containing the parent work's `slug`, `title`, and `authors`. The existing `copy_count` field SHALL remain present.

#### Scenario: Edition with work metadata
- **WHEN** a GET request is made to `/api/editions/dune-chronicles-hardcover` and the edition links to work "Dune" with author "Frank Herbert"
- **THEN** the response includes `work_meta: { slug: "dune", title: "Dune", authors: ["[[authors/frank-herbert]]"] }`

#### Scenario: Edition does not exist
- **WHEN** a GET request is made to `/api/editions/nonexistent`
- **THEN** the response has status 404
