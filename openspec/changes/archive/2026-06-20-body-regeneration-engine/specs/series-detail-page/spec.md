## ADDED Requirements

### Requirement: Series Detail page shows markdown body preview
The Series Detail page SHALL display a collapsible `<details>` element at the bottom of the page, with a `<summary>` labeled "Markdown Preview". The body content from the series API response's `body` field SHALL be rendered inside the `<details>` element using `react-markdown`. The element SHALL be closed by default.

#### Scenario: Series with rendered body
- **WHEN** the user visits a series detail page and the API response includes a `body` string
- **THEN** a collapsible "Markdown Preview" section appears at the bottom of the page

#### Scenario: Body rendering in preview
- **WHEN** the user opens the "Markdown Preview" section
- **THEN** the series name and ordered works list are rendered as proper HTML by `react-markdown`
