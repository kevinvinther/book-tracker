## Why

The CSS custom properties for dark mode were written as part of the "card-catalog" design system and are fully defined — a complete `.dark` block swaps every color variable for a "reading room at night" palette. The Tailwind v4 `@custom-variant dark (&:is(.dark *))` is active, and 12 component class strings already use `dark:` variants. But nothing applies the `.dark` class to `<html>`, no toggle exists, and no preference is persisted. The mode is unreachable.

## What Changes

- **FOUC-prevention script** in `index.html` `<head>` — reads the persisted theme from localStorage and applies `.dark` before the first paint, so the page never flashes light in dark mode
- **ThemeProvider context + `useTheme` hook** — a React context wrapping the app root that manages a three-state theme model (`light`, `dark`, `system`), toggles `.dark` on `<html>`, watches `prefers-color-scheme`, and persists to localStorage under the key `booktracker-theme`
- **Header toggle button** — a sun/moon icon button in the desktop nav bar that cycles between light and dark (explicit choice); system mode is selected in Settings
- **Settings page Appearance section** — a three-option selector (Light / Dark / System) added to the Settings page, visually grouped below the existing sections

## Capabilities

### New Capabilities
- `dark-mode-provider`: React context and hook that manages the three-state theme, synchronises the `.dark` class on `<html>`, watches the system preference media query, and persists to localStorage
- `dark-mode-toggle`: UI surfaces — a one-click sun/moon button in the desktop header and an Appearance section in Settings with three options

### Modified Capabilities
- `settings-page`: The Settings page gains an Appearance section with a theme selector (three radio options: Light, Dark, System)
- `dev-environment`: `index.html` gains a blocking inline `<script>` in `<head>` that reads localStorage and applies `.dark` before first render to prevent FOUC

## Impact

- `client/index.html` — add FOUC-prevention inline `<script>` in `<head>`
- `client/src/main.tsx` — wrap `<App />` with `<ThemeProvider>`
- `client/src/App.tsx` — add the header toggle button in the desktop nav
- `client/src/pages/Settings.tsx` — add Appearance section
- New files: `client/src/components/ThemeProvider.tsx`, `client/src/hooks/useTheme.ts`

## Supersedes

None.
