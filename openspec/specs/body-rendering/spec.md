# body-rendering Specification

## Purpose
Server-side markdown body generation from frontmatter + in-memory Index data, for all five entity types (Author, Series, Work, Edition, Copy).
## Requirements
### Requirement: renderBody dispatcher
The system SHALL provide a `renderBody(entity, index)` function in `server/src/lib/render-body.ts` that accepts any entity from the `Entity` union type and the in-memory `Index`, and returns a rendered markdown string. The function SHALL dispatch to the appropriate type-specific renderer based on `entity.type`.

#### Scenario: Dispatches to work renderer
- **WHEN** `renderBody` is called with a `Work` entity (type `"work"`)
- **THEN** it delegates to `renderWorkBody` and returns the result

#### Scenario: Dispatches to copy renderer
- **WHEN** `renderBody` is called with a `Copy` entity (type `"copy"`)
- **THEN** it delegates to `renderCopyBody` and returns the result

#### Scenario: Unknown type throws
- **WHEN** `renderBody` is called with an entity whose `type` is not one of `"author" | "series" | "work" | "edition" | "copy"`
- **THEN** it throws an error

### Requirement: renderWorkBody
The system SHALL provide a `renderWorkBody(work, index)` function that renders a Work entity as a markdown string with: an `# {title}` heading, an author/year/language metadata line (omitting absent fields), a `## Description` section (only if description is set), and an `## Editions` section listing each linked edition as a bullet with wikilink and summary metadata (publisher, year, translator, page count). Fields with no value SHALL be omitted from their lines.

#### Scenario: Work with all fields and editions
- **WHEN** `renderWorkBody` is called with a Work that has title, subtitle, authors, original_language, original_publish_year, description, and two linked editions
- **THEN** the output contains the title as an H1, an author line with wikilinks, a description section, and an editions list with two bullet entries

#### Scenario: Work with no optional fields
- **WHEN** `renderWorkBody` is called with a Work that has only title and authors
- **THEN** the output contains only the heading and author line — no description section, no editions section (if no editions exist)

#### Scenario: Edition with translator contributor
- **WHEN** an edition has a contributor with role `"translator"`
- **THEN** its bullet entry in the work body includes "translated by {name}"

#### Scenario: Edition with no page_count
- **WHEN** an edition has no `page_count`
- **THEN** its bullet entry omits the page count

### Requirement: renderEditionBody
The system SHALL provide a `renderEditionBody(edition, index)` function that renders an Edition entity as a markdown string with: a heading that prioritizes translator name > publisher > format > page count > bare work title for the subtitle, a metadata block (publisher, publish date, page count, format, language, ISBN, contributors), a `## My Copies` section listing each linked copy as a bullet with wikilink and summary (format, condition, status), and a `## Notes` section with a bullet list of wikilinks to notes that reference this edition. Fields with no value SHALL be omitted.

#### Scenario: Edition with translator
- **WHEN** the edition's work is "Dune" and the edition has a contributor with role `"translator"` and name `"Pierre"` 
- **THEN** the heading includes `# Dune — Pierre Translation`

#### Scenario: Edition with no translator but has publisher
- **WHEN** the edition has no translator contributor but has publisher "Ace Books"
- **THEN** the heading includes `# {Work Title} — Ace Books`

#### Scenario: Edition with no translator and no publisher
- **WHEN** the edition has no translator and no publisher but has format "paperback"
- **THEN** the heading includes `# {Work Title} — paperback`

#### Scenario: Edition with copies
- **WHEN** the edition has two linked copies
- **THEN** the `## My Copies` section lists both as bullet items

#### Scenario: Edition with no copies
- **WHEN** the edition has no copies
- **THEN** the `## My Copies` section is omitted

### Requirement: renderCopyBody
The system SHALL provide a `renderCopyBody(copy, index)` function that renders a Copy entity as a markdown string with: a heading using the same priority chain as Edition body, a metadata block (edition link, author link, translator, condition, status, cover image, acquired, location, price), a `## Reading History` section with one `###` subsection per read-through (each with a facts-in-heading summary and a Date/Page/% table sorted newest-first), a `## Loan History` section with a table (Borrower | Lent | Expected | Returned), and a `## Notes` section with a bullet list of wikilinks to notes. Fields and sections with no data SHALL be omitted.

#### Scenario: Copy with read-throughs
- **WHEN** a copy has two read-throughs, one finished with rating 9.0 and one currently reading
- **THEN** the body contains both read-through subsections with tables
- **AND** the finished read-through heading includes the rating and date range
- **AND** the reading read-through heading indicates "Started" with date

#### Scenario: Page log table format
- **WHEN** a read-through has page log entries
- **THEN** the table has columns `| Date | Page | % |`
- **AND** entries are sorted newest-first (most recent page log entry first)
- **AND** dates use YYYY-MM-DD format
- **AND** percentage shows `—` when the edition has no `page_count`

#### Scenario: Read-through header with finished status
- **WHEN** a read-through is `status: "finished"` with `finished_date` set
- **THEN** the heading shows `### Read-through N · Jun 1 – Aug 15, 2025 · Finished · ★ 9.0/10`

#### Scenario: Read-through header with DNF status
- **WHEN** a read-through is `status: "dnf"` with `finished_date` set but no rating
- **THEN** the heading shows `### Read-through N · Jun 1 – Aug 15, 2025 · DNF`

#### Scenario: Copy with loans
- **WHEN** a copy has loans
- **THEN** the loan history table lists each loan
- **AND** unreturned loans show `—` in the Returned column

#### Scenario: Copy with no read-throughs and no loans
- **WHEN** a copy has no read-throughs and no loans
- **THEN** those sections are omitted from the body

#### Scenario: Copy with notes
- **WHEN** a copy has notes
- **THEN** the Notes section lists each note as a wikilink bullet

#### Scenario: Copy with condition and location
- **WHEN** a copy has `condition: "good"` and `location: "living room shelf"`
- **THEN** the metadata block shows `**Condition:** good · **Status:** owned` and `**Location:** living room shelf`

#### Scenario: Copy with price
- **WHEN** a copy has `price_amount: 14.50` and `price_currency: "EUR"`
- **THEN** the metadata block shows `**Price:** 14.50 EUR`

### Requirement: renderAuthorBody
The system SHALL provide a `renderAuthorBody(author, index)` function that renders an Author entity as a markdown string with: an `# {name}` heading, and a `## My Works` section listing each linked work as a wikilink bullet. The list SHALL be minimal — wikilinks only, no copy counts or read status.

#### Scenario: Author with works
- **WHEN** an author has two linked works
- **THEN** the body contains two wikilink bullets under `## My Works`

#### Scenario: Author with no works
- **WHEN** an author has no linked works
- **THEN** the `## My Works` section is omitted

### Requirement: renderSeriesBody
The system SHALL provide a `renderSeriesBody(series, index)` function that renders a Series entity as a markdown string with: an `# {name}` heading, and an ordered numbered list of linked works (by `series_position` ascending, unpositioned works last). When `series.total_works` is set and exceeds the count of linked works, placeholder entries for missing positions SHALL be rendered as `{n}. — (not in library)`. The placeholder numbering SHALL be sequential: if works at positions 1 and 3 are in the library, they are rendered as items 1 and 2, and a placeholder appears at position 3.

#### Scenario: Series with positioned works
- **WHEN** a series has three works at positions 1, 2, and 3
- **THEN** the body lists them as `1. [[works/slug1]]`, `2. [[works/slug2]]`, `3. [[works/slug3]]`

#### Scenario: Series with total_works exceeding linked works
- **WHEN** a series has `total_works: 5` and 3 linked works
- **THEN** the body lists the 3 works followed by two placeholder entries `4. — (not in library)` and `5. — (not in library)`

#### Scenario: Series with total_works equal to linked works
- **WHEN** a series has `total_works: 3` and 3 linked works
- **THEN** no placeholder entries appear

#### Scenario: Series with total_works but no linked works
- **WHEN** a series has `total_works: 4` and 0 linked works
- **THEN** the body shows 4 placeholder entries from position 1 to 4

#### Scenario: Series with unpositioned works
- **WHEN** a series has works with and without `series_position`
- **THEN** positioned works appear first, unpositioned works last

#### Scenario: Series with no works and no total_works
- **WHEN** a series has no linked works and no `total_works`
- **THEN** the body contains only the heading

### Requirement: Body rendering is pure and stateless
Each render function SHALL be a pure function: given the same entity and index state, it SHALL always return the same string. Render functions SHALL NOT perform I/O (no `readFile`, no `writeFile`, no `fetch`). All data SHALL come from the entity object and the in-memory Index.

#### Scenario: Pure function behavior
- **WHEN** `renderCopyBody` is called twice with the same copy and index
- **THEN** both calls return identical string output

### Requirement: Edition wikilink in copy body uses human-readable display text
In the Copy body metadata block, the edition wikilink SHALL use a human-readable display text following the priority chain: translator name ("Name Translation") > publisher > format > page count ("N pages") > raw slug. This is the same priority chain used by the heading generation. The wikilink format SHALL be `[[editions/{slug}|{display-text}]]`.

#### Scenario: Edition with translator
- **WHEN** a copy links to an edition that has a translator contributor
- **THEN** the edition wikilink in the Copy body uses display text "{translator-name} Translation"

#### Scenario: Edition with publisher but no translator
- **WHEN** a copy links to an edition that has a publisher but no translator
- **THEN** the edition wikilink uses display text matching the publisher name

#### Scenario: Edition with format but no translator or publisher
- **WHEN** a copy links to an edition with format "hardcover" but no translator or publisher
- **THEN** the edition wikilink uses display text "hardcover"

#### Scenario: Edition with page_count but no other distinguishing fields
- **WHEN** a copy links to an edition with only page_count set (no translator, publisher, or format)
- **THEN** the edition wikilink uses display text "{N} pages"

#### Scenario: Edition with no distinguishing fields
- **WHEN** a copy links to an edition with no translator, publisher, format, or page_count
- **THEN** the edition wikilink falls back to the raw slug as display text

### Requirement: Work subtitle rendered in body
The Work body SHALL render `subtitle` as italic text on a line immediately following the `# {title}` heading, only when `subtitle` is set. When subtitle is absent, no extra line SHALL be emitted.

#### Scenario: Work with subtitle
- **WHEN** `renderWorkBody` is called with a Work that has `subtitle: "Book One"`
- **THEN** the body contains `*Book One*` on the line after the `# {title}` heading

#### Scenario: Work without subtitle
- **WHEN** `renderWorkBody` is called with a Work that has no subtitle
- **THEN** no italic subtitle line appears between the heading and the metadata line

