## 1. FOUC prevention

- [x] 1.1 Add blocking inline `<script>` to `client/index.html` `<head>` that reads `booktracker-theme` from localStorage and applies `.dark` to `<html>` before first paint

## 2. ThemeProvider context and hook

- [x] 2.1 Create `client/src/components/ThemeProvider.tsx` with React context, `ThemeProvider` component, and `useTheme` hook
- [x] 2.2 Implement theme state as `"light" | "dark" | "system"` with localStorage persistence under `booktracker-theme`
- [x] 2.3 Derive `effectiveTheme` from stored state and `prefers-color-scheme` media query
- [x] 2.4 Synchronise `.dark` class on `document.documentElement` whenever effective theme changes
- [x] 2.5 Subscribe to `prefers-color-scheme` change events and clean up on unmount
- [x] 2.6 Wrap `<App />` with `<ThemeProvider>` in `client/src/main.tsx`

## 3. Header toggle button

- [x] 3.1 Add sun/moon toggle button to desktop header nav in `client/src/App.tsx` between GlobalSearch and Stats
- [x] 3.2 Button calls `toggleTheme()` from `useTheme` — cycles between explicit light and dark
- [x] 3.3 Button displays `Sun` icon from lucide-react when effective theme is dark, `Moon` when light
- [x] 3.4 Hide toggle button on mobile (`hidden` until `md` breakpoint)

## 4. Settings page Appearance section

- [x] 4.1 Add "Appearance" section to `client/src/pages/Settings.tsx` below the Genres section, separated by `border-t border-rule pt-8`
- [x] 4.2 Render three radio inputs with labels (Light / Dark / System) driven by `useTheme`
- [x] 4.3 Selecting a radio option calls `setTheme()` with the corresponding value

## 5. Verification

- [x] 5.1 Toggle between light and dark from header — confirm every page renders correctly in both modes
- [x] 5.2 Set theme to System, change OS preference — confirm follow and FOUC-free reload
- [x] 5.3 Confirm theme persists across page reloads and new tabs
- [x] 5.4 Verify mobile layout does not show header toggle, and Settings page toggle works on narrow viewports
