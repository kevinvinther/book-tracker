# dark-mode-toggle Specification

## Purpose
UI surfaces for toggling dark mode: a sun/moon button in the desktop header and an Appearance section in Settings.
## Requirements
### Requirement: Header theme toggle button
The desktop application header SHALL include a theme toggle button that displays a sun icon when the effective theme is dark and a moon icon when the effective theme is light.

#### Scenario: Toggle button visible in desktop header
- **WHEN** the application renders on a viewport 768px or wider
- **THEN** a theme toggle button is visible in the header navigation bar
- **AND** the button is positioned between the global search bar and the Stats link

#### Scenario: Toggle button cycles theme
- **WHEN** the user clicks the toggle button while the stored theme is `"light"`
- **THEN** the stored theme changes to `"dark"`
- **AND** the `.dark` class is added to `<html>`

#### Scenario: Toggle button handles system mode
- **WHEN** the user clicks the toggle button while the stored theme is `"system"`
- **THEN** the stored theme changes to the opposite of the current effective theme (explicit choice)

#### Scenario: Toggle icon reflects effective theme
- **WHEN** the effective theme is `"dark"`
- **THEN** the toggle button displays a sun icon (lucide-react `Sun`)
- **AND** when the effective theme is `"light"`, the button displays a moon icon (lucide-react `Moon`)

#### Scenario: Toggle button hidden on mobile
- **WHEN** the viewport is narrower than 768px
- **THEN** the header theme toggle button SHALL be hidden
- **AND** the mobile bottom navigation bar does not include a theme toggle

### Requirement: Settings page Appearance section
The Settings page SHALL include an "Appearance" section with a theme selector offering three options: Light, Dark, and System.

#### Scenario: Appearance section is visible
- **WHEN** the user navigates to `/settings`
- **THEN** an "Appearance" section is displayed, visually separated from the library path and genres sections
- **AND** the section shows the current theme selection

#### Scenario: Selecting a theme option
- **WHEN** the user selects "Dark" from the Appearance section
- **THEN** the stored theme changes to `"dark"`
- **AND** the `.dark` class is applied to `<html>`
- **AND** the header toggle button icon updates accordingly

#### Scenario: Selecting System option
- **WHEN** the user selects "System" from the Appearance section
- **THEN** the stored theme changes to `"system"`
- **AND** the effective theme follows the operating system preference

#### Scenario: Radio buttons reflect current selection
- **WHEN** the Settings page renders with the stored theme set to `"dark"`
- **THEN** the "Dark" radio option is checked
- **AND** the "Light" and "System" options are not checked
