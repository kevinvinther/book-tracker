# global-search-ui Specification

## Purpose
The frontend search bar component and its integration into the app header, including keyboard shortcuts, results dropdown, and recent search persistence.

## Requirements
### Requirement: The application SHALL display a search input field in the header navigation bar, visible on every page.
The application SHALL display a search input field in the header navigation bar on every page. On viewports below 768px, the search input SHALL initially render as a compact search icon button; tapping the icon SHALL expand the search input to full width.

#### Scenario: Search bar visible on all pages
- **WHEN** the user navigates to any page (grid, detail, stats, settings, add)
- **THEN** a search input with a search icon is visible in the header

#### Scenario: Search bar position on desktop
- **WHEN** the header is rendered on a desktop viewport (768px+)
- **THEN** the search bar appears between the app logo and the navigation links (Stats, Settings)

#### Scenario: Search bar compact on mobile
- **WHEN** the header is rendered on a mobile viewport (below 768px)
- **THEN** the search bar initially appears as a search icon button in the header, not as a full text input

#### Scenario: Search bar expands on mobile tap
- **WHEN** the user taps the search icon on a mobile viewport
- **THEN** the search input expands to full width within the header, pushing aside or overlaying adjacent elements

### Requirement: Debounced auto-search as user types

The search input SHALL debounce input by 200ms and automatically fetch results from the search endpoint as the user types.

#### Scenario: Results appear after typing
- **WHEN** the user types "dune" into the search bar
- **THEN** after 200ms of no further input, a fetch to `/api/search?q=dune` is triggered
- **AND** a results dropdown appears below the search bar with grouped results

#### Scenario: Rapid typing debounces
- **WHEN** the user types "du" then immediately "n" then "e" within 200ms windows
- **THEN** only one fetch is made, with the final query "dune"

#### Scenario: Empty input hides dropdown
- **WHEN** the user clears the search input
- **THEN** the dropdown closes

#### Scenario: No results state
- **WHEN** a search returns no matches
- **THEN** the dropdown shows a "No results found" message

### Requirement: Results dropdown with grouped sections

The search results dropdown SHALL display results grouped by entity type, with each group labelled. Each result SHALL be clickable and navigate to the relevant detail page.

#### Scenario: Group headings
- **WHEN** search returns Works, Authors, and Editions
- **THEN** the dropdown shows sections with headings "Works", "Authors", and "Editions" in that order

#### Scenario: Group ordering
- **WHEN** search results span multiple types
- **THEN** the group order is: Works, Authors, Series, Editions, Copies, Notes, Loans

#### Scenario: Click navigates to detail page
- **WHEN** the user clicks a Work result
- **THEN** the browser navigates to `/works/<slug>` and the dropdown closes

#### Scenario: Group only shown when results exist
- **WHEN** a search returns Works and Copies but no Authors, Series, Editions, Notes, or Loans
- **THEN** only "Works" and "Copies" headings appear in the dropdown

### Requirement: Keyboard shortcut to focus search

The application SHALL support `/` and `Ctrl+K` (or `Cmd+K` on macOS) as keyboard shortcuts to focus the search input.

#### Scenario: Slash key focuses search
- **WHEN** the user presses `/` and no text input, textarea, or contenteditable element is focused
- **THEN** the search input receives focus

#### Scenario: Slash key ignored in text inputs
- **WHEN** the user presses `/` while a text input or textarea is focused
- **THEN** the `/` character is typed into that input normally and the search bar is not focused

#### Scenario: Ctrl+K always focuses search
- **WHEN** the user presses `Ctrl+K` (or `Cmd+K` on macOS)
- **THEN** the search input receives focus regardless of which element currently has focus

#### Scenario: Escape closes dropdown and blurs
- **WHEN** the search dropdown is open
- **THEN** pressing `Escape` closes the dropdown and blurs the search input

### Requirement: Recent searches in localStorage

The application SHALL store recent search queries in localStorage (max 5) and display them when the search input is empty and focused.

#### Scenario: Recent searches shown on empty focus
- **WHEN** the user focuses the empty search input and has recent searches stored
- **THEN** the dropdown shows a "Recent" section with the stored queries as clickable items

#### Scenario: Clicking recent search re-executes
- **WHEN** the user clicks a recent search query
- **THEN** the search input is populated with that query and results are fetched and displayed

#### Scenario: New search stored
- **WHEN** the user performs a search for "dune"
- **THEN** "dune" is stored at the front of the recent searches list in localStorage

#### Scenario: Duplicate search moved to front
- **WHEN** the user searches for "dune" which is already in recent searches
- **THEN** "dune" is moved to the front; no duplicate entry is created

#### Scenario: Max 5 recent searches
- **WHEN** the user has 5 recent searches and performs a 6th
- **THEN** the oldest entry is removed; the list remains at 5 entries

#### Scenario: No recent searches state
- **WHEN** the user focuses the empty search input and has no recent searches
- **THEN** no "Recent" section is shown; the dropdown shows a placeholder hint
