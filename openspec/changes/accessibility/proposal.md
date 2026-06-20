## Supersedes

None.

## Why

The app currently has negligible accessibility support beyond basic semantic HTML and focus-visible styles. Screen reader users cannot perceive dynamic content updates (error messages, search results, loading states), keyboard users cannot activate table rows or navigate custom dropdowns, form inputs in inline editing contexts have no labels, toggle buttons have no programmatic state indication, and chart content on the Stats page is entirely invisible to assistive technology. This change brings every page and component to WCAG 2.1 AA compliance, matching the build plan's priority for accessibility before file watching and edge-case polish.

## What Changes

- **ARIA attributes on all interactive components**: `role="alert"` on error containers, `aria-live` regions for dynamic content, `aria-pressed` on toggle buttons, `aria-current` on active filters, `aria-expanded` on disclosures, `aria-labelledby`/`aria-describedby` on form inputs, `aria-label` on decorative SVG icons
- **Keyboard navigation throughout**: arrow key navigation in AuthorSelector/GenreSelector dropdowns, Enter to activate PageLogTable rows for editing, keyboard activation for LoanHistory edit actions, Tab-flow through all dialogs with focus restoration on close
- **Semantic HTML audit**: heading hierarchy (h1→h4) on all pages, skip-to-content link, `<nav>` labels for multiple landmarks, `<fieldset>`/`<legend>` for related form groups where missing
- **Focus management**: auto-focus first interactive element on modal open, focus restoration on close, visible focus indicators on every interactive element
- **Screen reader support**: accessible names on all inputs, buttons, links, and image alt text; `.sr-only` utility class for screen-reader-only content
- **Color contrast**: verify every foreground/background pair with automated tooling, fix any failures
- **ESLint integration**: add `eslint-plugin-jsx-a11y` for static analysis of accessibility issues at dev time
- **Runtime a11y checks**: add `@axe-core/react` for in-browser accessibility warnings during development
- **Chart accessibility**: `role="img"` and `aria-label` with data summaries on Recharts SVG containers

## Capabilities

### New Capabilities

- `accessibility`: WCAG 2.1 AA compliance across all pages and components — covers semantic HTML, ARIA attributes, keyboard navigation, focus management, screen reader support, color contrast, and accessibility tooling integration.

### Modified Capabilities

None. All existing functional requirements remain unchanged — only accessibility annotations and keyboard handlers are added.

## Impact

- **Client code**: every page component (8 files), every component (32 files), `index.css` (new `.sr-only` class), new ESLint config, new dev dependency `@axe-core/react`
- **No server changes**: zero API, schema, or backend modifications
- **No data changes**: no migration, no new files in the library
- **No visual changes**: same UI appearance; all changes are invisible (ARIA attributes, keyboard handlers, label associations)
- **Dependencies added**: `eslint-plugin-jsx-a11y` (dev), `@axe-core/react` (dev)
