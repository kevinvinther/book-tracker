# author-detail-page Specification

## Purpose
TBD - created for change author-series-detail-pages. Update Purpose after archive.

## Requirements
### Requirement: Author Detail page renders author metadata
The Author Detail page at `/authors/:slug` SHALL display the author's `name` as the page heading and any `aliases` as secondary text.

#### Scenario: Author with aliases
- **WHEN** a user navigates to `/authors/fyodor-dostoevsky` and the author has `aliases: ["F. M. Dostoevsky"]`
- **THEN** the page displays "Fyodor Dostoevsky" as the heading and "F. M. Dostoevsky" as aliases

#### Scenario: Author with no aliases
- **WHEN** a user navigates to `/authors/isaac-asimov` and the author has no `aliases`
- **THEN** only the author name is displayed, no aliases section

#### Scenario: Author does not exist
- **WHEN** a user navigates to `/authors/nonexistent-author`
- **THEN** the page displays a "No such author" message with a link back to the home page

### Requirement: Author Detail page lists works with cover thumbnails
The Author Detail page SHALL display all works linked to the author as a list of cards, each showing the work's primary cover thumbnail (or a placeholder), title, copy count, and aggregate read status. Works SHALL be sorted alphabetically by title.

#### Scenario: Author with multiple works
- **WHEN** a user navigates to `/authors/fyodor-dostoevsky` who has 3 linked works
- **THEN** the page displays a list of 3 work cards, each with cover image, title, and copy count

#### Scenario: Work with no cover image
- **WHEN** a work linked to the author has no `primary_cover`
- **THEN** the work card displays a placeholder thumbnail

#### Scenario: Author with no works
- **WHEN** a user navigates to an author who has zero linked works
- **THEN** the page displays "No works yet" as an empty state under the author name

### Requirement: Work cards on Author Detail link to Work Detail
Each work card on the Author Detail page SHALL be a link to `/works/:slug`.

#### Scenario: Clicking a work card
- **WHEN** a user clicks a work card on the Author Detail page
- **THEN** the browser navigates to `/works/{work.slug}`

### Requirement: Author Detail page has an Edit Author button
The Author Detail page SHALL display an "Edit Author" button that opens a modal dialog with fields for `name` and `aliases`. Submitting the form SHALL send `PATCH /api/authors/:slug` and refresh the page data on success.

#### Scenario: Opening the edit modal
- **WHEN** the user clicks "Edit Author"
- **THEN** a modal dialog appears with inputs pre-filled with the author's current `name` and `aliases`

#### Scenario: Saving changes
- **WHEN** the user edits the name and submits the form
- **THEN** the author is updated via `PATCH /api/authors/:slug` and the page refreshes with the new data

### Requirement: Author Detail page shows markdown body preview
The Author Detail page SHALL display a collapsible `<details>` element at the bottom of the page, with a `<summary>` labeled "Markdown Preview". The body content from the author API response's `body` field SHALL be rendered inside the `<details>` element using `react-markdown`. The element SHALL be closed by default.

#### Scenario: Author with rendered body
- **WHEN** the user visits an author detail page and the API response includes a `body` string
- **THEN** a collapsible "Markdown Preview" section appears at the bottom of the page

#### Scenario: Body rendering in preview
- **WHEN** the user opens the "Markdown Preview" section
- **THEN** the author name and works wikilinks are rendered as proper HTML by `react-markdown`

