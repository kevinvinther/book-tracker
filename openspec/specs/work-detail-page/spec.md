# work-detail-page Specification

## Purpose
Client page that displays a single Work's full metadata, its editions, and the copies owned of each edition, with an entry point for editing the work.
## Requirements
### Requirement: Work Detail route and data loading
The system SHALL render a Work Detail page at `/works/:slug`, fetching the work via `GET /api/works/:slug` (which includes a `body` field in the response), its editions via `GET /api/editions?work=:slug`, and all of its copies via `GET /api/copies?work=:slug`.

#### Scenario: Visiting a work's detail page
- **WHEN** the user navigates to `/works/dune`
- **THEN** the page fetches the work (with body), its editions, and its copies, and renders them once all three resolve

#### Scenario: Work does not exist
- **WHEN** the user navigates to `/works/nonexistent`
- **THEN** the page shows a not-found state instead of a broken layout

### Requirement: Work Detail page shows markdown body preview
The Work Detail page SHALL display a collapsible `<details>` element at the bottom of the page, with a `<summary>` labeled "Markdown Preview". The body content from `work.body` SHALL be rendered inside the `<details>` element using `react-markdown`. The element SHALL be closed by default.

#### Scenario: Work with rendered body
- **WHEN** the user visits a work detail page and the API response includes a `body` string
- **THEN** a collapsible "Markdown Preview" section appears at the bottom of the page
- **AND** opening it reveals the rendered markdown content

#### Scenario: Body rendering in preview
- **WHEN** the user opens the "Markdown Preview" section
- **THEN** wikilinks, tables, bold text, and headings are rendered as proper HTML by `react-markdown`

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
Each copy card SHALL display the copy's format (from its edition), condition, ownership status badge, location, and acquisition source — all currently available fields. Additionally, each copy card SHALL display the most recent read-through's status and page progress when the copy has read-throughs. When the copy has outstanding loans (any loan with no `returned_date`), the card SHALL display "Lent to [comma-joined borrower names]" below the status badge.

#### Scenario: Copy with read-through status
- **WHEN** a copy has a most recent read-through with `status: "reading"` and last page 104 on an edition with 604 pages
- **THEN** the copy card shows "Reading · pg 104/604" alongside the existing fields

#### Scenario: Copy with outstanding loan
- **WHEN** a copy has an outstanding loan to "Sarah"
- **THEN** the copy card displays "Lent to Sarah" below the status badge

#### Scenario: Copy with multiple outstanding loans
- **WHEN** a copy has outstanding loans to "Sarah" and "Mike"
- **THEN** the copy card displays "Lent to Sarah, Mike"

#### Scenario: Copy without read-throughs or outstanding loans
- **WHEN** a copy has no read-throughs and no outstanding loans (or all loans are returned)
- **THEN** the copy card shows the existing fields without any read-through or loan information

#### Scenario: Copy with condition and location set
- **WHEN** a copy has `condition: "good"` and `location: "living room shelf"`
- **THEN** the copy card shows both values alongside its status badge

### Requirement: Edit Work
The page SHALL provide an "Edit Work" action that navigates to the dedicated work edit page at `/works/:slug/edit` (replacing the former edit modal), where the work's mutable fields are edited and submitted via `PATCH /api/works/:slug`. The page SHALL additionally provide a "Merge with another work…" action that opens the `MergeWorksModal` with the current work pre-identified as the winner, allowing the user to combine the current work with another existing work.

#### Scenario: Editing a work's title
- **WHEN** the user clicks "Edit Work", changes the title on `/works/:slug/edit`, and saves
- **THEN** the work is updated via `PATCH /api/works/:slug` and the user is returned to the work detail page showing the new title

#### Scenario: Opening the merge modal from Work Detail
- **WHEN** the user clicks "Merge with another work…" on the Work Detail page for `/works/the-hobbit`
- **THEN** the `MergeWorksModal` opens with "the-hobbit" pre-set as the winner

### Requirement: Work Detail recent notes
The Work Detail page SHALL display a "Recent Notes" section using the `NoteTimeline` component. The section SHALL fetch and display all notes referencing the current work (both notes targeting the work directly and notes on any copies of the work). Notes SHALL appear in reverse-chronological order with an "Add Note" button. The "Add Note" button SHALL open the `NoteEditorModal` in create mode, pre-targeting the current work. When no notes exist, the section SHALL display "No notes yet."

#### Scenario: Work with notes across copies
- **WHEN** the user visits `/works/dune` and notes exist targeting the work and its copies
- **THEN** the "Recent Notes" section displays all matching notes via `NoteTimeline`

#### Scenario: Add note from work detail
- **WHEN** the user clicks "Add Note" in the Recent Notes section
- **THEN** the `NoteEditorModal` opens in create mode with the work pre-targeted

#### Scenario: Work with no notes
- **WHEN** the work has no notes
- **THEN** the "Recent Notes" section displays "No notes yet." with an "Add Note" button

### Requirement: Retry button on error
When the work detail fetch fails with an error, the error message SHALL be accompanied by a "Retry" button that re-triggers the data fetch.

#### Scenario: Error with retry action
- **WHEN** `GET /api/works/:slug` fails and an error message is displayed
- **THEN** a "Retry" button is displayed alongside the error message
- **AND WHEN** the user clicks "Retry"
- **THEN** the data fetch is re-triggered

### Requirement: Skeleton loading state
While the work data is loading, the page SHALL display a skeleton layout matching the page structure instead of "Loading…" text.

#### Scenario: Work detail loading shows skeleton
- **WHEN** the user navigates to `/works/:slug` and data is loading
- **THEN** skeleton blocks are displayed matching the cover image area, title, subtitle, author lines, metadata chips, description block, and editions section

### Requirement: Broken cover image fallback
The cover image SHALL display the "No cover" placeholder when the image URL fails to load (e.g., missing file, network error).

#### Scenario: Cover image fails to load
- **WHEN** the work's cover image `<img>` element fires an `onError` event
- **THEN** the image is replaced by the existing "No cover" placeholder div

#### Scenario: Valid cover image loads normally
- **WHEN** the work's cover image loads successfully
- **THEN** the `<img>` element is displayed without the placeholder

### Requirement: Unknown author fallback
When a work has zero authors in its `authors_meta` array, the metadata section SHALL display "Unknown author" in place of the missing author links.

#### Scenario: Work with empty author list on detail page
- **WHEN** a work has `authors_meta` as an empty array or `null`
- **THEN** the author section displays "Unknown author" styled with `text-muted-foreground`

