## ADDED Requirements

### Requirement: Sticky toolbar on WorkGrid
On viewports below 768px, the WorkGrid page SHALL render its toolbar (search bar, sort dropdown, filter button, and Add Book button) with sticky positioning so it remains visible while the user scrolls the work grid.

#### Scenario: Toolbar stays visible while scrolling
- **WHEN** the user scrolls down through the work grid on a mobile viewport
- **THEN** the toolbar remains fixed at the top of the viewport area (below the header), staying visible

#### Scenario: Toolbar is not sticky on desktop
- **WHEN** the viewport width is 768px or above
- **THEN** the toolbar scrolls normally with the page content

### Requirement: Genre filters in bottom sheet
On viewports below 768px, the inline genre chip row SHALL be replaced by a "Filters" button in the toolbar. Tapping the button SHALL open a bottom sheet dialog displaying the genre chips.

#### Scenario: Filter button on mobile
- **WHEN** the viewport width is below 768px
- **THEN** genre filter chips are not displayed inline; a "Filters" button appears in the toolbar

#### Scenario: Active filter badge
- **WHEN** a genre filter is active on a mobile viewport
- **THEN** the "Filters" button shows an indicator (e.g., dot or count badge) to signal an active filter

#### Scenario: Filter sheet opens
- **WHEN** the user taps the "Filters" button on mobile
- **THEN** a bottom sheet dialog opens displaying the genre chips, with "All" as the first option

#### Scenario: Selecting a filter in the sheet
- **WHEN** the user taps a genre chip in the filter sheet
- **THEN** the grid filters to that genre and the sheet closes

#### Scenario: Genre chips inline on desktop
- **WHEN** the viewport width is 768px or above
- **THEN** genre filter chips are displayed inline below the toolbar as before

### Requirement: Responsive grid columns
The work grid SHALL render at least two columns at all viewport widths.

#### Scenario: Two columns on phone
- **WHEN** the viewport width is below 640px
- **THEN** the work grid displays two cards per row

#### Scenario: Three or more columns on tablet and desktop
- **WHEN** the viewport width is 640px or above
- **THEN** the work grid displays three or more cards per row, scaling up with available width
