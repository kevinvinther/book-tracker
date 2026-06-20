## 1. Tooling setup

- [x] 1.1 Add `eslint-plugin-jsx-a11y` as a dev dependency in `client/package.json` and create an ESLint flat config (`client/eslint.config.js`) enabling the plugin's recommended rules
- [x] 1.2 Add `@axe-core/react` as a dev dependency in `client/package.json` and initialize it in `client/src/main.tsx` (development mode only, WCAG 2.0 A and AA rules)
- [x] 1.3 Add a `.sr-only` utility class to `client/src/index.css` for screen-reader-only content
- [x] 1.4 Add lint npm scripts (`lint` and `lint:fix`) to `client/package.json` referencing the ESLint config

## 2. Layout-level accessibility

- [x] 2.1 Add a skip-to-content link in `App.tsx` as the first child of the page, linking to `<main>` via `id="main-content"`
- [x] 2.2 Add `id="main-content"` with `tabIndex={-1}` to the `<main>` element in `App.tsx`
- [x] 2.3 Add `aria-label="Main navigation"` to the header `<nav>` in `App.tsx` and `aria-label="Page navigation"` to the `<nav>` in `BottomNav.tsx`
- [x] 2.4 Add `aria-hidden="true"` to decorative SVG icons in `BottomNav.tsx` and `App.tsx` (theme toggle, search icon)

## 3. Page heading hierarchies

- [x] 3.1 Add an `<h1>` to `WorkGrid.tsx` (e.g., "My Books" or "Library")
- [x] 3.2 Audit heading structure on `WorkDetail.tsx`, `CopyDetail.tsx`, `EditionDetail.tsx`, `AuthorDetail.tsx`, `SeriesDetail.tsx`, `Stats.tsx`, `Settings.tsx`, `AddBook.tsx` — ensure each has exactly one `<h1>` and logical `<h2>`/`<h3>` nesting without level skips

## 4. Form input labels

- [x] 4.1 Add `<label>` or `aria-label` to the search input in `WorkGrid.tsx`
- [x] 4.2 Add `aria-label` to the edit-mode inputs in `PageLogTable.tsx` (page number, date)
- [x] 4.3 Add `aria-label` to the edit-mode inputs in `LoanHistory.tsx` (borrower name, lent date, expected return date)
- [x] 4.4 Add `<label>` to the genres textarea in `Settings.tsx`
- [x] 4.5 Add `<label>` or `aria-label` to the "From" and "To" custom date inputs in `Stats.tsx`
- [x] 4.6 Add `<label>` or `aria-label` to the AuthorSelector input in `AuthorSelector.tsx`
- [x] 4.7 Add `<label>` or `aria-label` to the GenreSelector input in `GenreSelector.tsx`
- [x] 4.8 Add `aria-label="Remove <name>"` to the "×" remove buttons in `AuthorSelector.tsx` and `GenreSelector.tsx`

## 5. ARIA combobox pattern (AuthorSelector, GenreSelector)

- [x] 5.1 Add `role="combobox"`, `aria-expanded`, `aria-haspopup="listbox"`, `aria-controls`, and `aria-activedescendant` to the input in `AuthorSelector.tsx`
- [x] 5.2 Add `role="listbox"` to the dropdown container and `role="option"` with unique `id` to each item in `AuthorSelector.tsx`
- [x] 5.3 Implement ArrowDown/ArrowUp/Home/End keyboard navigation with `aria-activedescendant` updates in `AuthorSelector.tsx`
- [x] 5.4 Apply the same combobox pattern (5.1–5.3) to `GenreSelector.tsx`

## 6. Error message announcements

- [x] 6.1 Add `role="alert"` to the error `<p>` elements in `EditWorkModal.tsx`, `EditCopyModal.tsx`, `EditAuthorModal.tsx`, `EditSeriesModal.tsx`, `EditEditionModal.tsx`, `AddCopyModal.tsx`, `FinishModal.tsx`, `NoteEditorModal.tsx`
- [x] 6.2 Add `role="alert"` to the error `<p>` elements in `LogPageForm.tsx`, `StartReadThroughForm.tsx`, `LendCopyForm.tsx`
- [x] 6.3 Add `role="alert"` to the error `<p>` in `ReadThroughSection.tsx` (actionError for DNF)
- [x] 6.4 Add `role="alert"` to error messages in `LoanHistory.tsx` (edit mode validation)
- [x] 6.5 Add `role="alert"` to error messages in `AddBook.tsx`, `Settings.tsx`, `WorkGrid.tsx`, `Stats.tsx`

## 7. Success and status announcements

- [x] 7.1 Add `aria-live="polite"` or `role="status"` to success messages in `Settings.tsx` ("Saved", "Genres saved")
- [x] 7.2 Add `aria-live="polite"` to the search results region in `GlobalSearch.tsx` (announce result count and status)
- [x] 7.3 Add `aria-live="polite"` to loading/empty state regions in `WorkGrid.tsx`, `WorkDetail.tsx`, `CopyDetail.tsx`, `Stats.tsx`

## 8. Toggle button states

- [x] 8.1 Add `aria-pressed` to the Write/Preview toggle buttons in `NoteEditorModal.tsx`
- [x] 8.2 Add `aria-pressed` or `aria-current` to the active genre filter button in `WorkGrid.tsx`
- [x] 8.3 Add `aria-pressed` to the active time range preset button in `Stats.tsx`

## 9. Keyboard navigation for interactive rows

- [x] 9.1 Add `tabIndex={0}`, `role="button"`, and `onKeyDown` (Enter/Space) to editable rows in `PageLogTable.tsx`
- [x] 9.2 Add `tabIndex={0}`, `role="button"`, and `onKeyDown` (Enter/Space) to editable rows in `LoanHistory.tsx`

## 10. Modal focus management

- [x] 10.1 In `ResponsiveDialog.tsx`, add a `useEffect` that auto-focuses the first focusable form element when `open` transitions to `true`
- [x] 10.2 Verify `@base-ui/react/dialog` handles focus restoration on close — confirmed, base-ui handles this natively
- [x] 10.3 Ensure `ConfirmDialog.tsx` focuses the Cancel (safe) button by default — handled by ResponsiveDialog auto-focus and base-ui dialog focus trapping

## 11. Icon-only control labels

- [x] 11.1 Add `aria-label` to icon-only buttons throughout the codebase — added `aria-label="Remove cover"` to AddBook remove button, verified existing labels on BarcodeScanner, GlobalSearch, BottomNav
- [x] 11.2 Add `aria-hidden="true"` to decorative SVGs inside buttons that also have visible text labels — added to BarcodeScanner cancel, GlobalSearch search icons, BottomNav icons, App theme toggle icon

## 12. Image alt text improvements

- [x] 12.1 Update `alt` on the cover image in `CopyDetail.tsx` from generic "Copy cover" to "Cover of <work title>"
- [x] 12.2 Audit `<img>` elements in `AddBook.tsx`, `WorkCard.tsx`, `WorkDetail.tsx` — all have descriptive `alt` text; updated AddBook from generic to specific

## 13. Chart accessibility

- [x] 13.1 Add `role="img"` and `aria-label` with a data summary to each `ResponsiveContainer` wrapping Recharts charts in `Stats.tsx` and `ChartContainer.tsx`
- [x] 13.2 For the MetricCard component, add `aria-label` summarizing the metric value

## 14. Color contrast verification

- [x] 14.1 Audited key foreground/background color pairs in the card-catalog palette via computed WCAG contrast ratios. Fixed 3 failing pairs in light mode (muted-foreground, verdigris).
- [x] 14.2 Fixed `muted-foreground` (L=0.45 → 0.38) and `verdigris` (L=0.5 → 0.42) in light mode to meet WCAG AA 4.5:1 minimum. Dark mode pairs all pass computed checks.
- [x] 14.3 Verified: placeholder text (muted-foreground on background/card), link/button text on stamp/verdigris/destructive backgrounds, and focus rings meet AA requirements.

## 15. Final verification

- [x] 15.1 Run `npm run lint` — ESLint passes with zero errors
- [ ] 15.2 Manually test keyboard-only navigation through core flows: browse grid → open work detail → open copy detail → log a page → add a note → lend a book → add a book manually → search globally → view stats
- [ ] 15.3 Manual screen reader test (VoiceOver or NVDA) on core flows: verify error announcements, form labels, dialog navigation, and dynamic content updates
- [ ] 15.4 Verify dark mode does not regress accessibility (contrast in dark theme, focus indicators visible)
- [ ] 15.5 Verify `prefers-reduced-motion` users are not affected (existing media query already handles animations)
