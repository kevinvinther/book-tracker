## Context

The project uses Tailwind v4 with a CSS-first configuration (no `tailwind.config.js`). All color tokens are CSS custom properties on `:root`. A complete `.dark` block in `index.css` defines the dark palette. The `@custom-variant dark (&:is(.dark *))` rule is active, so any element with a `.dark` ancestor gets the dark variants. Twelve component class strings already use `dark:` prefixes — once the `.dark` class lands on `<html>`, those variants will become active. No React theme context, no toggle, and no persistence code exists yet.

## Goals / Non-Goals

**Goals:**
- Apply `.dark` class on `<html>` when the user's effective theme is dark
- Support three states: `light`, `dark`, `system` (where system follows `prefers-color-scheme`)
- Persist the user's choice in localStorage under `booktracker-theme`
- Prevent a flash of incorrect theme (FOUC) via a blocking inline script in `<head>`
- Provide a one-click toggle in the desktop header and a three-option selector in Settings

**Non-Goals:**
- Multi-theme or custom color schemes — only light and dark
- Server-side theme preferences — this is purely client-side
- Installing `@tailwindcss/typography` — the `prose` classes that exist are unrelated
- Changing any of the already-defined dark mode CSS color values

## Decisions

### 1. Custom React context over `next-themes`

**Chosen:** A small, self-contained `ThemeProvider` component and `useTheme` hook (~50 lines total).

**Rationale:** `next-themes` provides multi-theme support, CSS variable injection, and server-side rendering helpers — none of which this app needs. The app already has CSS custom properties defined on `:root`/`.dark` and only needs class toggling + localStorage + media query watching. A custom context avoids a dependency for what amounts to trivial DOM manipulation. The `shadcn/ui` v4 ecosystem also doesn't prescribe `next-themes` — it expects you to manage the `.dark` class yourself.

**Alternative considered:** `next-themes` would add ~3KB to the bundle and a dependency to maintain. Its `attribute="class"` mode is the default we'd use anyway. The custom implementation is simpler and more transparent.

### 2. Theme state model: three-value enum

**Chosen:** A single state variable that can be `"light"`, `"dark"`, or `"system"`, stored directly to localStorage.

**Rationale:** A boolean `isDark` plus a separate `useSystem` boolean is awkward when the user switches between modes. A three-value model cleanly maps to the three options shown in Settings. The effective theme is derived: if `system`, use the media query result; otherwise use the stored value.

### 3. FOUC prevention: blocking inline `<script>` in `<head>`

**Chosen:** A small (under 10 lines) synchronous `<script>` placed before any CSS or JS imports in `index.html`. It reads `localStorage.getItem("booktracker-theme")`, checks the media query if the stored value is `"system"`, and adds `.dark` to `document.documentElement.classList` if appropriate.

**Rationale:** This is the standard Tailwind approach to FOUC-free dark mode. A `useEffect` in React would run after the JavaScript bundle loads and executes — several hundred milliseconds after first paint on a slow connection. By then the light styles have already rendered. A sync script in `<head>` blocks rendering until it completes, which is negligible (a single localStorage read and classList mutation).

No build step is needed — Vite processes `index.html` as-is. The script uses vanilla JS with no imports.

### 4. Toggle placement: header icon + Settings section

**Chosen:** Both. A sun/moon button in the desktop header nav (between GlobalSearch and Stats) for one-click access, and an "Appearance" section with three radio options in Settings for full control.

**Rationale:** Putting the toggle only in Settings makes discovery poor. Putting it only in the header makes the system/default mode undiscoverable. Both surfaces complement each other: the header button is for quick switching, Settings is for the initial setup.

**Desktop header layout (after):**
```
Book Tracker | [Search] | ☀ | Stats | Settings
```

The icon uses lucide-react's `Sun` in dark mode (to switch to light) and `Moon` in light mode (to switch to dark). The header button cycles between explicit light and dark — clicking it moves the state away from `system` to an explicit choice.

### 5. File structure

**Chosen:** Two files:
- `client/src/components/ThemeProvider.tsx` — React context definition, provider component, the `useTheme` hook
- No separate `useTheme.ts` hook file — the hook lives alongside the provider since they're tightly coupled

The `ThemeProvider` is imported in `main.tsx` and wraps `<App />`. No other files import it directly — components that need the theme consume it via the `useTheme` hook.

### 6. Settings page theme selector UX

**Chosen:** Three radio inputs with labels (Light / Dark / System), styled to match the existing settings form fields. No toggle switch — radio buttons clearly show all three options at once.

## Risks / Trade-offs

- **FOUC script maintenance**: The inline `<script>` duplicates the "resolve effective theme" logic from the React hook. If the resolution logic changes, both must be updated. → Mitigation: the logic is trivial (check stored value, if `system` check media query, toggle class). Document the duplication in a comment in both places.
- **SSR incompatibility**: The FOUC script reads `localStorage` and `matchMedia`, which don't exist in Node.js. → Mitigation: this app has no SSR. The script is only in `index.html` which only runs in the browser.
- **`prefers-color-scheme` listener**: The React effect must add/remove a media query listener. If the listener isn't cleaned up, it leaks. → Mitigation: standard `useEffect` cleanup pattern with `addEventListener`/`removeEventListener` on the `MediaQueryList`.
