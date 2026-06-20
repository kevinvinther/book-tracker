## MODIFIED Requirements

### Requirement: Work Detail route and data loading
The system SHALL render a Work Detail page at `/works/:slug`, fetching the work via `GET /api/works/:slug` (which includes a `body` field in the response), its editions via `GET /api/editions?work=:slug`, and all of its copies via `GET /api/copies?work=:slug`.

#### Scenario: Visiting a work's detail page
- **WHEN** the user navigates to `/works/dune`
- **THEN** the page fetches the work (with body), its editions, and its copies, and renders them once all three resolve

#### Scenario: Work does not exist
- **WHEN** the user navigates to `/works/nonexistent`
- **THEN** the page shows a not-found state instead of a broken layout

## ADDED Requirements

### Requirement: Work Detail page shows markdown body preview
The Work Detail page SHALL display a collapsible `<details>` element at the bottom of the page, with a `<summary>` labeled "Markdown Preview". The body content from `work.body` SHALL be rendered inside the `<details>` element using `react-markdown`. The element SHALL be closed by default.

#### Scenario: Work with rendered body
- **WHEN** the user visits a work detail page and the API response includes a `body` string
- **THEN** a collapsible "Markdown Preview" section appears at the bottom of the page
- **AND** opening it reveals the rendered markdown content

#### Scenario: Body rendering in preview
- **WHEN** the user opens the "Markdown Preview" section
- **THEN** wikilinks, tables, bold text, and headings are rendered as proper HTML by `react-markdown`
