## ADDED Requirements

### Requirement: Copy Detail page shows markdown body preview
The Copy Detail page SHALL display a collapsible `<details>` element at the bottom of the page, with a `<summary>` labeled "Markdown Preview". The body content from the copy API response's `body` field SHALL be rendered inside the `<details>` element using `react-markdown`. The element SHALL be closed by default.

#### Scenario: Copy with rendered body
- **WHEN** the user visits a copy detail page and the API response includes a `body` string
- **THEN** a collapsible "Markdown Preview" section appears at the bottom of the page

#### Scenario: Body rendering in preview
- **WHEN** the user opens the "Markdown Preview" section
- **THEN** metadata, reading history tables, loan history table, and notes wikilinks are rendered as proper HTML by `react-markdown`
