## Context

The book tracker client is a React + Tailwind single-page app with 8 pages and ~32 components. It uses `@base-ui/react` for the Button primitive and Dialog components, `react-router-dom` v7 for routing, `recharts` for the Stats page, and a custom `ResponsiveDialog` wrapper around `@base-ui/react/dialog`. All form inputs are raw HTML styled with Tailwind — there is no form abstraction layer.

The current accessibility state:
- **Present**: semantic HTML (`<nav>`, `<main>`, `<header>`, `<table>`, `<form>`), `focus-visible:ring-2` on most interactive elements, basic `aria-label` on 4 elements (theme toggle, search toggle, close search, cancel scan), `min-h-[44px]` touch targets on mobile, `@media (prefers-reduced-motion: reduce)` for animations
- **Missing**: ARIA roles on custom widgets, `aria-live` regions for dynamic content, keyboard activation for interactive rows, label associations on inline editing inputs, programmatic toggle state indication, skip-to-content link, chart accessibility, `alt` text quality on some images, `.sr-only` utility

## Goals / Non-Goals

**Goals:**
- Every interactive element is reachable and operable by keyboard alone
- Every dynamic content update (error, success, loading, search results) is announced to screen readers
- Every form input has an accessible name (via `<label>`, `aria-label`, or `aria-labelledby`)
- Every custom widget (dropdowns, toggle groups, modals) has correct ARIA roles and states
- All deployed color combinations meet WCAG AA contrast minimums (4.5:1 normal text, 3:1 large text)
- Heading hierarchy is consistent and complete on every page
- Static analysis catches common a11y mistakes at dev time

**Non-Goals:**
- Automated a11y testing framework (jest-axe, Cypress) — no client test infrastructure exists
- WCAG AAA compliance (e.g., 7:1 contrast)
- Accessible data-table alternatives for Recharts charts (only aria-label summaries)
- RTL language support
- Server-side or file-system accessibility concerns

## Decisions

### 1. Custom combobox ARIA (AuthorSelector, GenreSelector)

**Decision:** Use `role="combobox"` on the wrapper, `role="listbox"` on the dropdown popup, `role="option"` on each item, `aria-expanded` on the input, `aria-activedescendant` tracking the highlighted item via `id`.

**Rationale:** These are fully custom dropdowns with type-ahead filtering — not native `<select>` elements. The ARIA 1.2 combobox pattern is the correct semantic model. This gives screen readers full awareness of the widget's state and which option is active.

**Alternatives considered:**
- Native `<datalist>` — rejected; can't style the dropdown or support multi-select "chip" UI
- `aria-haspopup="listbox"` without `role="combobox"` — rejected; combobox is more specific and better supported
- Leave as-is — rejected; invisible to screen readers

### 2. Error announcements

**Decision:** Wrap error `<p>` elements with `role="alert"` (which implicitly carries `aria-live="assertive"`) for immediate announcement. For success/status messages, use `aria-live="polite"` on a container `<div>`.

**Rationale:** `role="alert"` is the WAI-ARIA spec's mechanism for important, time-sensitive information. It interrupts the screen reader's current output, which is appropriate for validation errors that block form submission. Success messages use `polite` to avoid unnecessary interruption.

**Alternatives considered:**
- `aria-live="assertive"` manually — rejected; `role="alert"` is the idiomatic equivalent
- `aria-live="polite"` for everything — rejected; errors need immediate attention
- Visual-only errors — current state; rejected

### 3. PageLogTable row keyboard activation

**Decision:** Add `tabIndex={0}` and `onKeyDown` (Enter/Space to activate) to table rows that have `onClick` for entering edit mode. Add `role="button"` to the `<tr>`.

**Rationale:** A `<tr>` with `onClick` is functionally a button but semantically a table row. Adding `role="button"` and keyboard handling makes it behave like one for assistive technology and keyboard users.

**Alternatives considered:**
- Wrap each cell's content in a `<button>` — rejected; changes layout and is more invasive
- Remove the row click and add explicit "Edit" buttons per row — rejected; would make the UI feel heavier

### 4. Focus management on modal open

**Decision:** In each modal component, add a `useEffect` that fires when `open` transitions to `true`, finds the first focusable element (input, select, textarea, or button), and calls `.focus()` on it.

**Rationale:** `@base-ui/react/dialog` traps focus inside the dialog but does not auto-focus the first form field. Without explicit focus management, screen reader users start at the dialog title and must tab through. Auto-focusing the first field matches user expectation for forms.

**Alternatives considered:**
- Rely on `@base-ui/react/dialog` defaults — rejected; focus lands on the dialog container, not the first field
- `autoFocus` attribute — rejected; React 19 supports it but it's unreliable with `@base-ui`'s portal rendering

### 5. Skip-to-content link

**Decision:** Add a fixed-position link at the top of the layout (`<a href="#main-content" className="sr-only focus:not-sr-only ...">`). Add `id="main-content"` to the `<main>` element.

**Rationale:** WCAG 2.4.1 (Bypass Blocks) requires a mechanism to skip repeated navigation. The header `<nav>` and persistent search bar are repeated blocks. A skip link is the standard pattern.

### 6. `.sr-only` utility

**Decision:** Add a standard Tailwind `.sr-only` class to `index.css` using the `@utility` directive or as a `@layer utilities` block. Follow the established pattern from Tailwind's own sr-only recipe: visually hidden but accessible to screen readers.

**Rationale:** Needed for the skip-to-content link, and potentially for other screen-reader-only content. Adding it to the existing CSS file avoids a new dependency.

### 7. Color contrast approach

**Decision:** Manually audit every foreground/background pair in the custom card-catalog palette using axe DevTools browser extension. Adjust oklch lightness values in `index.css` if any pair fails WCAG AA. Focus on: primary text on card backgrounds, muted text, link colors, button text on stamp/verdigris backgrounds, destructive text, and placeholder text.

**Rationale:** The palette uses oklch with intentional color choices. A manual audit is practical given ~20 color pairs. Automated CI contrast checking would require browser rendering (Puppeteer) which is out of scope.

**Alternatives considered:**
- Automated Puppeteer + axe-core CI job — out of scope (no CI, no Puppeteer)
- Replace entire palette — rejected; overkill

### 8. Chart accessibility

**Decision:** Add `role="img"` and `aria-label` to each Recharts `ResponsiveContainer` wrapper with a text summary of the chart's data (e.g., "Bar chart: Books read per month. January: 2, February: 1, March: 3").

**Rationale:** Recharts renders to SVG, which has no inherent text alternative for screen readers. `role="img"` with `aria-label` makes the chart perceivable as an image with a text description. Full data-table alternatives are deferred.

### 9. ESLint integration

**Decision:** Add `eslint-plugin-jsx-a11y` as a dev dependency with a minimal flat ESLint config (`eslint.config.js`). Enable the plugin's recommended rules. Add `lint` script entries to `package.json` files.

**Rationale:** The plugin catches ~30 common a11y issues at dev time (missing alt text, missing labels, invalid ARIA, non-interactive element event handlers). It's the standard approach for React a11y linting.

**Alternatives considered:**
- biome — rejected; not already in the project, and eslint-plugin-jsx-a11y is more mature
- No linting — current state; rejected

### 10. `@axe-core/react` for runtime checks

**Decision:** Add `@axe-core/react` as a dev dependency. Initialize it in `main.tsx` so it only runs in development mode, logging accessibility violations to the browser console.

**Rationale:** Axe catches issues that static analysis cannot — color contrast, focus order, heading hierarchy, landmark structure. Running in dev-only mode has zero production impact.

### 11. Toggle button states

**Decision:** For toggle-like buttons (Write/Preview in NoteEditorModal, genre filters in WorkGrid, time range presets in Stats), add `aria-pressed="true/false"` to communicate the toggled state programmatically.

**Rationale:** These buttons look like toggles but are semantically plain buttons. `aria-pressed` is the WAI-ARIA attribute for toggle buttons and is well-supported by screen readers.

### 12. Inline editing input labels

**Decision:** For inputs inside `<td>` cells (PageLogTable edit mode, LoanHistory edit mode), add `aria-label` attributes since `<label>` elements don't fit cleanly in table cells.

**Rationale:** Table cell editing doesn't accommodate visible `<label>` elements without disrupting the column layout. `aria-label` provides the accessible name without adding visual noise.

**Alternatives considered:**
- `<label>` with `.sr-only` — rejected; adds DOM complexity without benefit over `aria-label`
- Leave unlabeled — current state; rejected

## Risks / Trade-offs

- **`@axe-core/react` console noise**: Axe may produce many warnings during development. → Mitigation: initialize with only `wcag2a` and `wcag2aa` tags, exclude `best-practice` rules.
- **`aria-activedescendant` complexity**: Managing dynamic IDs for combobox options adds code. → Mitigation: use index-based IDs (`${id}-option-${index}`), mirror the pattern used in existing Enter/Escape handling.
- **Color palette changes**: Adjusting oklch values for contrast may slightly shift the visual feel. → Mitigation: adjust only the lightness channel, preserving hue and chroma. Document the adjusted values.
- **Skip link visual design**: The skip link must be visible on focus but hidden otherwise — must not clip or overlap the header. → Mitigation: use the established `.sr-only focus:not-sr-only` pattern with `z-50` positioning.
