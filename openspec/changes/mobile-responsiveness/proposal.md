## Supersedes

None.

## Why

The app works on desktop but is broken on phones. The header navigation overflows without wrapping, touch targets are too small (some under 20px), dialogs are awkwardly centered on narrow screens, and the work grid's filter toolbar pushes content far down the page. The app was designed as a tool you'd use while standing at your bookshelf — phone-first navigation is essential.

## What Changes

- **Bottom navigation bar** replaces the desktop header links on screens below 768px, with four tabs: Grid (home), Stats, Add (quick-add page), Settings. The desktop header keeps its existing text links untouched.
- **Responsive dialog positioning**: form modals and note editor become full-width bottom-anchored sheets on mobile (below 768px) while staying centered on desktop. A shared `ResponsiveDialog` wrapper avoids repeating responsive logic across nine separate modals.
- **Sticky WorkGrid toolbar**: the search bar, sort dropdown, and "Add Book" button become sticky below the header on mobile so they stay visible while scrolling the grid. Genre filter chips move from an inline row into a filter bottom-sheet dialog to avoid eating screen space.
- **Touch targets**: all interactive elements get responsive sizing so touch targets reach at least 44px on mobile. Buttons, form inputs, genre chips, table action buttons, and select controls all increase padding below 768px.
- **Table horizontal scroll**: page log and loan history tables keep `overflow-x-auto` with visual scroll-shadow cues. No card-layout conversion needed.
- **Grid column adjustments**: WorkGrid already does 2 columns at `sm` — add a 1-column layout for very narrow screens (below 480px).

## Capabilities

### New Capabilities

- `mobile-navigation`: A fixed bottom tab bar (Grid, Stats, Add, Settings) that appears below the `md` breakpoint (768px), replacing the desktop header's Stats and Settings text links. Uses safe-area-inset-bottom for notched devices. The active route is highlighted.
- `responsive-dialogs`: A shared `ResponsiveDialog` wrapper component that renders modals as centered popups on desktop and full-width bottom-anchored sheets on mobile. Wraps the existing `@base-ui/react/dialog` primitives. Used by all edit modals, the note editor, the finish modal, and confirmation dialogs.
- `mobile-work-grid-toolbar`: A sticky toolbar on the WorkGrid page below 768px containing the search bar, sort dropdown, a filter button (opens genre filters in a bottom sheet), and the Add Book button. Replaces the current inline toolbar that scrolls away.

### Modified Capabilities

- `work-grid-page`: Toolbar becomes sticky on mobile; genre filter chips move from inline row to a bottom-sheet dialog behind a filter button. Grid adjusts to 1 column at very narrow widths (below 480px).
- `global-search-ui`: On mobile, the GlobalSearch search bar becomes a compact icon button in the header that expands when tapped, to save header space alongside the bottom nav.

## Impact

- **Client components (new)**: `ResponsiveDialog` (shared dialog wrapper), `BottomNav` (bottom tab bar)
- **Client pages (modified)**: `WorkGrid` (sticky toolbar, filter sheet), `App` (header conditional rendering, bottom nav integration, GlobalSearch mobile adaptation)
- **Client components (modified)**: All edit/note/confirm modals switched to `ResponsiveDialog`; `GlobalSearch` mobile mode; `PageLogTable`, `LoanHistory` (scroll-shadow cue); `Button` (responsive size variants)
- **Client CSS**: `index.css` — scroll-shadow utility, bottom-nav safe-area rules, mobile dialog animation
- **No API changes**. No new dependencies. No backend impact.
