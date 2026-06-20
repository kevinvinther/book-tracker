## ADDED Requirements

### Requirement: Appearance theme selector
The Settings page SHALL include an "Appearance" section that allows the user to select between Light, Dark, and System theme modes using radio buttons. The section SHALL be visually separated from the library path and genres sections. The currently selected theme SHALL be reflected in the radio button state on mount and SHALL update immediately when a new option is chosen.

#### Scenario: Appearance section below genres
- **WHEN** the user navigates to `/settings`
- **THEN** an "Appearance" section is displayed below the Genres section
- **AND** it is separated by a border (matching the existing `border-t border-rule pt-8` pattern)

#### Scenario: Radio buttons reflect stored theme
- **WHEN** the stored theme is `"system"`
- **THEN** the "System" radio input is checked and the other two are not

#### Scenario: Selecting Light
- **WHEN** the user clicks the "Light" radio option
- **THEN** the stored theme changes to `"light"`
- **AND** the `.dark` class is removed from `<html>`

#### Scenario: Selecting Dark
- **WHEN** the user clicks the "Dark" radio option
- **THEN** the stored theme changes to `"dark"`
- **AND** the `.dark` class is added to `<html>`

#### Scenario: Selecting System
- **WHEN** the user clicks the "System" radio option
- **THEN** the stored theme changes to `"system"`
- **AND** the effective theme matches the operating system preference
