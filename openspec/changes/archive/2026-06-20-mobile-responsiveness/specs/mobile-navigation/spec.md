## ADDED Requirements

### Requirement: Bottom navigation bar on mobile
On viewports below 768px, the system SHALL render a fixed bottom navigation bar with four tabs: Grid, Stats, Add, and Settings. Each tab SHALL navigate to its respective route using client-side routing. The active tab SHALL be visually distinguished.

#### Scenario: Bottom nav appears on phone
- **WHEN** the viewport width is below 768px
- **THEN** a fixed navigation bar is rendered at the bottom of the screen with four tabs: Grid, Stats, Add, Settings

#### Scenario: Bottom nav is hidden on desktop
- **WHEN** the viewport width is 768px or above
- **THEN** the bottom navigation bar is not rendered

#### Scenario: Active tab is highlighted
- **WHEN** the user is on the `/stats` page
- **THEN** the Stats tab in the bottom nav shows a highlighted/active state distinct from the other three tabs

#### Scenario: Tab navigation works
- **WHEN** the user taps the "Add" tab
- **THEN** the browser navigates to `/add` and the Add tab becomes active

### Requirement: Desktop header links hidden on mobile
On viewports below 768px, the desktop header's "Stats" and "Settings" text links SHALL be hidden. The header SHALL display only the app logo/title and the search component.

#### Scenario: Header simplifies on mobile
- **WHEN** the viewport width is below 768px
- **THEN** the header contains only the app logo and the search bar; the text links "Stats" and "Settings" are absent

#### Scenario: Header is unchanged on desktop
- **WHEN** the viewport width is 768px or above
- **THEN** the header contains the app logo, search bar, "Stats" link, and "Settings" link as before

### Requirement: Safe area padding
The bottom navigation bar SHALL include padding for the device's safe area inset at the bottom edge to avoid overlap with system home indicators.

#### Scenario: Safe area on notched device
- **WHEN** the device has a home indicator (e.g., iPhone with notch)
- **THEN** the bottom nav bar sits above the home indicator with the safe-area-inset-bottom value as padding
