## Supersedes

None.

## Why

The app has all core features — CRUD, barcode scanning, read-through tracking, notes, loans, stats, search, dark mode, mobile layout, accessibility, file watching — but the experience degrades visibly under common real-world conditions. Loading shows plain "Loading…" text with no spatial continuity from the rendered page. API failures offer error messages with no recovery action. Long book titles vanish behind CSS truncation with no way to read the full text. Broken cover images show browser error icons. Missing ISBNs silently disappear from edition metadata. Works with zero authors (after a cascade deletion) show nothing where the author line belongs. And no test validates that the in-memory index stays fast at scale.

## What Changes

- **Loading skeletons**: Replace "Loading…" text with animated skeleton placeholders that match each page's layout. The work grid gets card-shaped skeletons; detail pages get structured block skeletons. The existing card-reveal animation is suppressed during skeleton phase.
- **Error retry**: Add a "Retry" button alongside every inline error message, calling the `refetch` function already exposed by every data-fetching hook. The GlobalSearch error state (currently set but never rendered) becomes visible.
- **Error boundary**: Wrap the app in a React error boundary that catches unhandled render exceptions and shows a recovery message with a "Reload" button instead of a white screen.
- **Text tooltips**: Add a `<Tooltip>` wrapper using `@base-ui/react/tooltip` (already a dependency) at every location where CSS `truncate` hides content — work cards, series lists, search results, navigation labels.
- **Broken cover fallback**: Add `onError` handlers on all `<img>` elements displaying cover images, swapping to the existing "No cover" placeholder when the image request fails.
- **Missing ISBN display**: Show "ISBN: —" on the Edition Detail page when ISBN is absent, instead of hiding the field entirely.
- **Unknown author display**: Show "Unknown author" on WorkCard, WorkDetail, and SeriesDetail when a work's author list is empty, instead of silently hiding the line.
- **Large-library performance test**: A new vitest test that generates 1000+ entity files in a temp directory, loads the in-memory index, and asserts sub-2-second startup and sub-100ms filtered lookups.

## Capabilities

### New Capabilities
- `error-boundary`: React error boundary component that catches render failures, displays a recovery message, and offers a reload action.
- `loading-skeletons`: Animated skeleton placeholder components matching page layouts, replacing plain "Loading…" text throughout the app.
- `text-tooltips`: Tooltip component (via `@base-ui/react/tooltip`) that reveals full text on hover at every CSS-truncated location.
- `large-library-test`: Vitest performance test verifying <2s index-load time and <100ms filtered lookups with 1000+ generated entity files.

### Modified Capabilities
- `work-grid-page`: Adds skeleton loading grid, retry button on error, and "Unknown author" fallback for zero-author works.
- `work-detail-page`: Adds skeleton loading, retry button on error, broken-cover fallback (img onError), and "Unknown author" fallback.
- `edition-detail-page`: Adds "ISBN: —" display when ISBN is absent.
- `global-search-ui`: Surfaces the error state that is currently set in the hook but never rendered.

## Impact

- **Frontend**: New components (`ErrorBoundary`, `Skeleton`, `Tooltip`). Modifications to `WorkCard`, `WorkGrid`, `WorkDetail`, `AuthorDetail`, `SeriesDetail`, `EditionDetail`, `CopyDetail`, `GlobalSearch`, `BottomNav`, and all image-rendering locations. No new dependencies — `@base-ui/react` already provides the tooltip primitive.
- **Backend**: No API or data changes. One new test file (`server/src/lib/index-perf.test.ts`) for large-library performance verification.
- **No breaking changes**. All changes preserve existing behavior and enhance edge cases.
