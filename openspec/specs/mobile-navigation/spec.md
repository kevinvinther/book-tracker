---
id: mobile-navigation
title: mobile-navigation
overview: "Bottom navigation bar for mobile viewports with tab-based routing and safe area handling."
requirementCount: 3
---

# mobile-navigation Specification

## Purpose
Provides a fixed bottom navigation bar on mobile viewports (< 768px) with five tabs (Home, Library, Stats, Add, Settings), hides desktop header links, and handles safe area insets for notched devices.

## Requirements

### Requirement: Bottom navigation bar on mobile
On viewports below 768px, the system SHALL render a fixed bottom navigation bar with five tabs: Home, Library, Stats, Add, and Settings. The Home tab SHALL navigate to `/` (the reading dashboard) and the Library tab SHALL navigate to `/library` (the work grid). Each tab SHALL navigate to its respective route using client-side routing. The active tab SHALL be visually distinguished.

#### Scenario: Bottom nav appears on phone
- **WHEN** the viewport width is below 768px
- **THEN** a fixed navigation bar is rendered at the bottom of the screen with five tabs: Home, Library, Stats, Add, Settings

#### Scenario: Bottom nav is hidden on desktop
- **WHEN** the viewport width is 768px or above
- **THEN** the bottom navigation bar is not rendered

#### Scenario: Active tab is highlighted
- **WHEN** the user is on the `/stats` page
- **THEN** the Stats tab in the bottom nav shows a highlighted/active state distinct from the other four tabs

#### Scenario: Home and Library are distinct tabs
- **WHEN** the user is on `/` (the dashboard)
- **THEN** the Home tab is active and the Library tab is not
- **AND WHEN** the user taps the Library tab
- **THEN** the browser navigates to `/library` and the Library tab becomes active

#### Scenario: Tab navigation works
- **WHEN** the user taps the "Add" tab
- **THEN** the browser navigates to `/add` and the Add tab becomes active

### Requirement: Desktop header links hidden on mobile
On viewports below 768px, the desktop header's "Library", "Stats", and "Settings" text links SHALL be hidden. The header SHALL display only the app logo/title and the search component.

#### Scenario: Header simplifies on mobile
- **WHEN** the viewport width is below 768px
- **THEN** the header contains only the app logo and the search bar; the text links "Library", "Stats", and "Settings" are absent

#### Scenario: Header is unchanged on desktop
- **WHEN** the viewport width is 768px or above
- **THEN** the header contains the app logo, search bar, "Library" link, "Stats" link, and "Settings" link

### Requirement: Safe area padding
The bottom navigation bar SHALL include padding for the device's safe area inset at the bottom edge to avoid overlap with system home indicators.

#### Scenario: Safe area on notched device
- **WHEN** the device has a home indicator (e.g., iPhone with notch)
- **THEN** the bottom nav bar sits above the home indicator with the safe-area-inset-bottom value as padding
