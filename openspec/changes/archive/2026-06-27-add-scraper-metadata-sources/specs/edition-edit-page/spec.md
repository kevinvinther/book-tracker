## MODIFIED Requirements

### Requirement: Enrich-from-sources panel

The page SHALL include an enrich panel that, on demand, fetches metadata from external sources via `GET /api/lookup/all` and lets the user adopt values field by field. The panel SHALL list all six sources (`google`, `openlibrary`, `goodreads`, `amazon`, `googleimages`, `kindlecovers`) each with an ephemeral, per-session checkbox; the four default sources (`google`, `openlibrary`, `goodreads`, `amazon`) SHALL be checked initially and the two cover-only image sources (`googleimages`, `kindlecovers`) SHALL be unchecked initially. The panel SHALL forward the edition's current title and author(s) as the `title` and `author` query parameters so the cover-only image sources can search by text. No external request SHALL be made until the user clicks the "Fetch metadata" button. The panel SHALL offer a skip-cache control that forwards `nocache` to the endpoint.

#### Scenario: Default selection on open
- **WHEN** the enrich panel first renders for an edition with an ISBN
- **THEN** Google Books, Open Library, Goodreads, and Amazon are checked, and Google Images and Kindle covers are unchecked

#### Scenario: Fetching from selected sources with title and author
- **WHEN** the user enables Google Images and clicks "Fetch metadata"
- **THEN** the panel calls `GET /api/lookup/all` with the chosen `sources` plus the current `title` and `author`, and shows the returned values for comparison

#### Scenario: No fetch on page load
- **WHEN** the edit page first renders
- **THEN** no request to `GET /api/lookup/all` is made until the user clicks "Fetch metadata"

## ADDED Requirements

### Requirement: Per-source failure notes

The enrich panel SHALL read the `errors` array returned by `GET /api/lookup/all` and display a per-source note for each source that was blocked or errored, distinct from a source that simply returned no values. This lets the user tell "the source was blocked" apart from "the source found nothing" and decide whether to retry (e.g. with skip-cache).

#### Scenario: Blocked source shown as failed
- **WHEN** the response includes `errors: [{ source: "amazon", reason: "blocked" }]`
- **THEN** the panel shows a note such as "Amazon — blocked" for that source, separate from the field comparison rows

#### Scenario: No error note for a clean empty source
- **WHEN** a selected source is in neither `results` nor `errors`
- **THEN** the panel shows no failure note for that source

### Requirement: Merging genres from a source

For the genres field specifically (where multiple sources contribute complementary values), the enrich panel SHALL offer an "Add" action alongside "Use". "Use" replaces the current genres with the source's genres (existing behaviour); "Add" merges the source's genres into the current set as a de-duplicated union, leaving genres already present untouched. Other fields keep replace-only adoption.

#### Scenario: Adding genres merges into the current set
- **WHEN** the current genres are `["fantasy"]` and the user clicks "Add" on a source offering `["fantasy", "space opera"]`
- **THEN** the genre selector contains `["fantasy", "space opera"]` (the duplicate is not repeated), and nothing is persisted until save

#### Scenario: Using genres still replaces
- **WHEN** the user clicks "Use" on a source's genres
- **THEN** the current genres are replaced by that source's genres, as before
