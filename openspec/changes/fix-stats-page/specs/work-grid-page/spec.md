## MODIFIED Requirements

### Requirement: The grid SHALL support filtering by genre, computed client-side from the genres present on the currently loaded works.

The grid SHALL support filtering by genre. On viewports 768px and above, genre chips SHALL be displayed inline below the toolbar. On viewports below 768px, genre chips SHALL be accessible via a "Filters" button that opens a bottom sheet dialog. The active genre filter SHALL be reflected in and seeded from the `?genre=` URL query parameter, so a link from another page (e.g. the stats page) lands with that genre pre-selected. Genre matching SHALL be performed on the normalized genre value (lowercase, trimmed, spaces collapsed to hyphens), so a normalized slug from the URL (e.g. `science-fiction`) matches a work whose raw genre is `Science Fiction`.

#### Scenario: Genre chip inline on desktop

- **WHEN** the user selects a genre chip on a desktop viewport
- **THEN** only works whose genres normalize to the selected genre are shown, and the `?genre=` parameter updates

#### Scenario: Genre filter via bottom sheet on mobile

- **WHEN** the user taps the "Filters" button on a mobile viewport
- **THEN** a bottom sheet opens with genre chips; selecting a chip filters the grid and closes the sheet

#### Scenario: Genre is seeded from the URL parameter on load

- **WHEN** the user navigates to `/library?genre=science-fiction`
- **THEN** the grid loads with that genre pre-selected and shows only works whose genres normalize to `science-fiction`

#### Scenario: Normalized matching tolerates raw genre casing

- **WHEN** the active genre is `science-fiction` and a work has the raw genre `Science Fiction`
- **THEN** that work is shown (the raw value is normalized before comparison)
