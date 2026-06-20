## Context

The app currently has minimal responsive styling — only grid column counts (`grid-cols-2 sm:grid-cols-3 ...`) and side-by-side → stacked layouts on detail pages use breakpoints. The header is a horizontal flex row of text links that overflows on narrow screens. Dialogs are always centered popups. Touch targets on buttons, genre chips, and table action links are below 20px. The intent is to make the app usable on phone browsers without changing API contracts, data models, or adding new dependencies.

The frontend uses Tailwind v4 (CSS-first config, `@theme inline` in `index.css`), `@base-ui/react/dialog` for all modals, and React Router v7 for client-side routing. The header + routes are defined inline in `App.tsx` (no layout wrapper component). Only one shadcn/ui component is used (Button).

## Goals / Non-Goals

**Goals:**
- Phone-browser usability: buttons, inputs, and links must be tappable without zooming
- Clear mobile navigation: users must be able to reach all four main destinations (Grid, Stats, Add, Settings) from any page on a phone
- Unobtrusive filter/search on mobile: searching and filtering the work grid should not push the content below the fold
- Consistent dialog UX on mobile: forms and confirmation prompts should feel native on a phone

**Non-Goals:**
- PWA, service worker, or install-to-homescreen
- Swipe gestures or long-press actions
- Dark mode (separate concern)
- Accessibility pass (separate concern, though touch targets are a shared concern)
- Server-side responsive detection — no UA sniffing or SSR changes
- Tablet-specific optimizations beyond what the responsive grid already handles
- Rewriting tables as card layouts — horizontal scroll is sufficient

## Decisions

### D1: Mobile breakpoint at `md` (768px)

Use Tailwind's `md:` prefix consistently as the mobile/desktop threshold. All mobile-specific layouts, the bottom nav, dialog bottom-sheet behavior, and touch sizing use `md:` overrides (mobile is the base, desktop is `md:` and up).

**Rationale:** 768px is the standard tablet boundary. The app's existing responsive styles already use `md:` for the detail page side-by-side layout switch. Consistency with existing breakpoints avoids confusion.

**Alternative considered:** A custom 640px breakpoint (`sm`) for phone-only. Rejected because the existing `sm:` breakpoint is already used for grid columns and form layouts; switching the bottom nav at `sm` would hide it on tablets where it's still useful.

### D2: Bottom nav uses `fixed bottom-0` with safe-area padding

A `<BottomNav>` component renders four `NavLink` buttons (Grid, Stats, Add, Settings) in a `fixed bottom-0 inset-x-0` bar with `pb-[env(safe-area-inset-bottom)]` for notched devices. The bar has a subtle top border matching `--rule` and a solid background. Each tab uses a Lucide icon + label, with active state highlighted via `text-primary`.

**Rationale:** Fixed bottom nav is the standard mobile web pattern. `NavLink` from React Router gives automatic active-route detection without manual state management. Safe-area padding prevents the nav from being hidden behind iOS home indicators.

**Alternative considered:** A hamburger menu / slide-out drawer. Rejected because the app has only 4 main destinations — a drawer adds interaction cost (tap to open, tap to select) vs. one-tap access with a tab bar.

### D3: Bottom nav hides the desktop header's "Stats" and "Settings" links

On mobile, the header reduces to just the logo and a compact search trigger. Stats and Settings are only accessible via the bottom nav, avoiding duplication. The desktop header (≥768px) is unchanged.

**Rationale:** Duplicating nav links in both header and bottom bar wastes screen space and creates confusion about which to use. The bottom nav is the primary navigation on mobile; the header becomes just branding + search.

### D4: Shared `ResponsiveDialog` wraps `@base-ui/react/dialog`

A new `<ResponsiveDialog>` component wraps `<Dialog.Popup>` with responsive positioning classes: `fixed inset-x-0 bottom-0 rounded-t-lg max-h-[90vh]` on mobile, `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(...)] max-h-[85vh]` on desktop. All existing modals (EditWork, EditEdition, EditCopy, EditAuthor, EditSeries, AddCopy, NoteEditor, FinishModal, ConfirmDialog) switch from raw `<Dialog.Popup>` to `<ResponsiveDialog>`.

**Rationale:** A single wrapper avoids repeating responsive positioning logic across 9 separate modal components. Using `@base-ui/react/dialog` (already a dependency) avoids adding a new library. The mobile bottom-sheet pattern matches native OS sheet behavior.

**Alternative considered:** Adding shadcn/ui's Sheet component (`npx shadcn add sheet`) for filter sheets and keeping existing dialogs as-is. Rejected because it introduces a new component library dependency for a single use case, and the existing dialogs need responsive adaptation anyway. One shared wrapper covers both use cases.

### D5: Touch target sizing — surgical responsive classes

Interactive elements get responsive padding and min-height via Tailwind's `md:` prefix. Example patterns:
- Buttons: `py-2.5 md:py-1.5` (mobile: ~44px min-height, desktop: ~28px)
- Genre chips: `py-2 md:py-1` (mobile: ~36px, desktop: ~20px)
- Form inputs: `py-2.5 md:py-1.5` 
- Select controls: `py-2.5 md:py-1.5`
- Table action buttons/links: `py-2 md:py-0`

These are applied per-component, not via a global CSS `@layer base` rule. A global rule risks unintended side effects in non-interactive layouts (chart labels, grid cards, etc.).

### D6: Sticky WorkGrid toolbar with filter sheet

The toolbar (search + sort + Add Book button) gets `sticky top-0 z-10` and a background color to match the page. The genre chips row is replaced by a "Filters" button that opens the genres in a bottom sheet (using `ResponsiveDialog`). The filter button shows a count badge when a genre is active.

**Rationale:** Sticky positioning (`position: sticky`) uses pure CSS — no JS scroll tracking or IntersectionObserver needed. The filter sheet moves genre chips off the main viewport, where they consumed significant vertical space on narrow screens. The filter button with badge provides clear affordance.

**Alternative considered:** A horizontal-scrolling genre chip row. Rejected because it makes the grid content start below the fold and requires horizontal swipe gestures that conflict with page scroll on some browsers.

### D7: Grid minimum 2 columns at all widths

The work grid renders at least 2 columns on all screen sizes. Single-column was tried but cards become excessively tall and information-sparse at phone widths. The grid starts at `grid-cols-2` and scales up through `sm:`, `lg:`, `xl:` breakpoints. The Author Detail page works grid follows the same pattern.

## Risks / Trade-offs

- **Bottom nav takes ~64px of vertical space** → Mitigation: the `main` element gets `pb-16 md:pb-0` so content doesn't hide behind the bar. On very short screens (iPhone SE, 568px height), the grid will have limited visible rows — this is an inherent phone constraint, not a bug.
- **Sticky toolbar covers ~56px** → Mitigation: toolbar stays compact (single row). On desktop the toolbar is not sticky (unchanged behavior).
- **Bottom-sheet dialogs hide behind software keyboard** → Mitigation: the `max-h-[90vh]` constraint leaves room for the keyboard to push content up. `Dialog.Portal` renders at document root, so keyboard interactions should be unaffected.
- **`env(safe-area-inset-bottom)` is zero on desktop browsers** → Mitigation: this is expected behavior — the `env()` function returns 0 when not on a notched device. The padding is purely additive, so it degrades safely.
- **480px breakpoint requires either `@custom-variant` or arbitrary value** → Mitigation: Tailwind v4 supports `min-[480px]:` directly. If that proves unreliable, a `@custom-variant xs (@media (min-width: 480px));` in `index.css` is the fallback.
