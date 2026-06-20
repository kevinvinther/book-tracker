## MODIFIED Requirements

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
