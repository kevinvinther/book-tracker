## ADDED Requirements

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

## MODIFIED Requirements

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
