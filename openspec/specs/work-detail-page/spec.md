# work-detail-page Specification

## Purpose
Client page that displays a single Work's full metadata, its editions, and the copies owned of each edition, with an entry point for editing the work.

## Requirements

### Requirement: Work Detail route and data loading
The system SHALL render a Work Detail page at `/works/:slug`, fetching the work via `GET /api/works/:slug`, its editions via `GET /api/editions?work=:slug`, and all of its copies via `GET /api/copies?work=:slug`.

#### Scenario: Visiting a work's detail page
- **WHEN** the user navigates to `/works/dune`
- **THEN** the page fetches the work, its editions, and its copies, and renders them once all three resolve

#### Scenario: Work does not exist
- **WHEN** the user navigates to `/works/nonexistent`
- **THEN** the page shows a not-found state instead of a broken layout

### Requirement: Metadata section
The page SHALL display the work's cover, title, subtitle (if set), resolved author names (from `authors_meta`, each linking to `/authors/:slug`), original language, genres, and description.

#### Scenario: Work with multiple authors
- **WHEN** a work has two linked authors
- **THEN** both author names are shown, each as a link to that author's detail route

### Requirement: Series link
If the work has a linked series, the page SHALL display the series name (from `series_meta`) as a link to `/series/:slug`. If the work has no series, this section SHALL be omitted.

#### Scenario: Work belongs to a series
- **WHEN** a work's `series_meta` is non-null
- **THEN** the series name is shown as a link to `/series/:slug`

#### Scenario: Work has no series
- **WHEN** a work's `series_meta` is null
- **THEN** no series section is rendered

### Requirement: Editions grouped with copy cards
The page SHALL render each edition the work has, and under each edition render a card per copy of that edition (grouped client-side from the work-level copies fetch by matching each copy's `edition` wikilink).

#### Scenario: Edition with two copies
- **WHEN** an edition has two copies
- **THEN** both copy cards render grouped under that edition's heading

#### Scenario: Edition with no copies
- **WHEN** an edition has zero copies
- **THEN** the edition heading still renders, with an empty/add-copy state beneath it

### Requirement: Copy card content
Each copy card SHALL display the copy's format (from its edition), condition, ownership status badge, location, and acquisition source — all currently available fields. Additionally, each copy card SHALL display the most recent read-through's status and page progress when the copy has read-throughs. Loan badges SHALL NOT be displayed (deferred to a future change).

#### Scenario: Copy with read-through status
- **WHEN** a copy has a most recent read-through with `status: "reading"` and last page 104 on an edition with 604 pages
- **THEN** the copy card shows "Reading · pg 104/604" alongside the existing fields

#### Scenario: Copy without read-throughs
- **WHEN** a copy has no read-throughs
- **THEN** the copy card shows the existing fields without any read-through information

#### Scenario: Copy with condition and location set
- **WHEN** a copy has `condition: "good"` and `location: "living room shelf"`
- **THEN** the copy card shows both values alongside its status badge

### Requirement: Edit Work
The page SHALL provide an "Edit Work" action that opens a modal form for editing the work's mutable fields, submitting via `PATCH /api/works/:slug`.

#### Scenario: Editing a work's title
- **WHEN** the user opens the edit modal, changes the title, and saves
- **THEN** a `PATCH /api/works/:slug` request is sent with the new title and the page reflects the update on success
