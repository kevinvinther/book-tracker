## ADDED Requirements

### Requirement: ThemeProvider context
The application SHALL include a `ThemeProvider` React component that wraps the application root and provides theme state to all descendant components via a `useTheme` hook.

The theme state SHALL be one of three string values: `"light"`, `"dark"`, or `"system"`.

The `useTheme` hook SHALL return `{ theme, setTheme, effectiveTheme, toggleTheme }` where:
- `theme` is the current stored state (`"light"`, `"dark"`, or `"system"`)
- `setTheme` is a function accepting one of the three values to update the stored state
- `effectiveTheme` is the resolved theme (`"light"` or `"dark"`) after considering the system preference
- `toggleTheme` cycles between explicit `"light"` and `"dark"`, overwriting `"system"`

#### Scenario: Provider wraps application root
- **WHEN** the application mounts
- **THEN** `ThemeProvider` is present in the React tree, wrapping `<App />`
- **AND** all descendant components can call `useTheme()` to access theme state

#### Scenario: Default theme is system
- **WHEN** a user visits the application for the first time (no localStorage entry for `booktracker-theme`)
- **THEN** the theme state defaults to `"system"`
- **AND** the effective theme matches the `prefers-color-scheme` media query result

### Requirement: .dark class synchronisation
The `ThemeProvider` SHALL manage the `.dark` class on `document.documentElement` (`<html>`) so that Tailwind's dark variant selector applies the correct palette.

#### Scenario: Dark mode applies class
- **WHEN** the effective theme resolves to `"dark"`
- **THEN** `document.documentElement.classList` contains `"dark"`
- **AND** all CSS custom properties defined in `.dark` are active

#### Scenario: Light mode removes class
- **WHEN** the effective theme resolves to `"light"`
- **THEN** `document.documentElement.classList` does not contain `"dark"`
- **AND** all CSS custom properties from `:root` are active

### Requirement: System preference tracking
When the stored theme is `"system"`, the `ThemeProvider` SHALL react to changes in the `prefers-color-scheme` media query.

#### Scenario: System switches to dark while in system mode
- **WHEN** the stored theme is `"system"`
- **AND** the operating system switches to dark mode
- **THEN** the `.dark` class SHALL be added to `<html>` without user interaction
- **AND** `effectiveTheme` returns `"dark"`

#### Scenario: System switches to light while in system mode
- **WHEN** the stored theme is `"system"`
- **AND** the operating system switches to light mode
- **THEN** the `.dark` class SHALL be removed from `<html>` without user interaction
- **AND** `effectiveTheme` returns `"light"`

#### Scenario: Media query listener is cleaned up
- **WHEN** the ThemeProvider unmounts
- **THEN** the `prefers-color-scheme` event listener SHALL be removed

### Requirement: localStorage persistence
The `ThemeProvider` SHALL persist the theme state to localStorage under the key `booktracker-theme` whenever it changes, and SHALL read from that key on mount to initialise state.

#### Scenario: Theme choice survives page reload
- **WHEN** the user sets the theme to `"dark"`
- **AND** the page is reloaded
- **THEN** the `ThemeProvider` reads `"dark"` from localStorage on mount
- **AND** the effective theme is `"dark"`
- **AND** the `.dark` class is applied to `<html>`

#### Scenario: Corrupt localStorage is ignored
- **WHEN** the localStorage value for `booktracker-theme` is not one of `"light"`, `"dark"`, or `"system"`
- **THEN** the `ThemeProvider` defaults to `"system"`
- **AND** the invalid value is overwritten on the next theme change
