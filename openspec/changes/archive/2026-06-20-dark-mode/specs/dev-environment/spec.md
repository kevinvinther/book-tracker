## ADDED Requirements

### Requirement: FOUC-prevention script
The `index.html` SHALL include a blocking inline `<script>` in the `<head>` element, before any stylesheet or module script, that reads the persisted theme from localStorage and applies the `.dark` class to `<html>` if the resolved theme is dark. This SHALL prevent a flash of the incorrect color scheme before the React application mounts.

#### Scenario: Dark mode persists across page load without flash
- **WHEN** the stored theme is `"dark"`
- **AND** the page is loaded or reloaded
- **THEN** the `.dark` class is present on `<html>` before the first paint
- **AND** no flash of light-themed content is visible

#### Scenario: Light mode does not apply dark class
- **WHEN** the stored theme is `"light"`
- **AND** the page is loaded or reloaded
- **THEN** the `.dark` class is NOT present on `<html>` before the first paint

#### Scenario: System mode respects OS preference before first paint
- **WHEN** the stored theme is `"system"`
- **AND** the operating system is in dark mode
- **AND** the page is loaded or reloaded
- **THEN** the `.dark` class is present on `<html>` before the first paint

#### Scenario: No stored theme defaults to system
- **WHEN** no `booktracker-theme` key exists in localStorage
- **AND** the operating system is in light mode
- **AND** the page is loaded for the first time
- **THEN** the `.dark` class is NOT present on `<html>` before the first paint

#### Scenario: Script is positioned before stylesheets
- **WHEN** `index.html` is served
- **THEN** the theme-resolution inline `<script>` appears before any `<link>`, `<style>`, or `<script type="module">` element in `<head>`
