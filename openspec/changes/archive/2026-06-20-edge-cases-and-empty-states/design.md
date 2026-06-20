## Context

The app's core features are complete, but its failure modes are raw. Loading states are plain text, errors have no recovery path, truncated text has no reveal mechanism, broken images show browser error icons, and missing optional fields leave layout gaps. The server has a solid vitest suite (22 test files) but no performance benchmark at scale.

All data-fetching hooks follow a consistent pattern: `{ data, loading, error, refetch }`. The `refetch` function is exposed everywhere but never wired to UI. The `@base-ui/react` library (already a dependency) provides a `Tooltip` primitive matching the existing `Dialog` and `Button` usage patterns. Tailwind has `animate-pulse` for skeleton animations.

## Goals / Non-Goals

**Goals:**
- Replace every `Loading…` text with a layout-matched skeleton placeholder
- Wire every `refetch` function to a "Retry" button visible alongside error messages
- Add a React error boundary at the app root for unhandled render failures
- Add tooltip-on-hover for every instance of CSS `truncate` hiding content
- Add `onError` handlers on all `<img>` elements for cover images
- Show "ISBN: —" when edition has no ISBN
- Show "Unknown author" when work has zero authors
- Add a server-side vitest performance test for 1000+ entity index load

**Non-Goals:**
- Client-side tests (no test infrastructure exists in `client/`)
- Pagination or virtual scrolling for the work grid
- Illustrations or icons in empty states (keep text-only empty states)
- Skeleton states for modal forms (they appear instantly)

## Decisions

### 1. Skeleton component pattern

**Decision:** Create a single `Skeleton` component (`client/src/components/Skeleton.tsx`) accepting `className` for sizing, plus per-page skeleton layout components (`WorkGridSkeleton`, `DetailPageSkeleton`).

**Alternatives considered:**
- Per-page inline skeletons — rejected because a shared primitive gives consistent animation timing and exposes a single place to respect `prefers-reduced-motion`.
- shadcn Skeleton — shadcn v4 does not ship a Skeleton component; the existing `components/ui/` directory has only `Button`. Building our own is simpler.

**Implementation:** The `Skeleton` component renders a `<div>` with `animate-pulse bg-muted rounded-sm`. Per-page skeletons compose multiple `<Skeleton>` blocks matching the real layout dimensions exactly. The work grid skeleton renders a grid of 10 card-shaped skeletons (matching the `WorkCard` aspect ratio of `[2/3]`) with `aria-busy="true"` and `aria-label="Loading books"`. When the skeleton is present, the `card-reveal` CSS animation is not applied.

### 2. Retry button pattern

**Decision:** Include a `<Button variant="outline" size="sm">` with text "Retry" and `onClick={refetch}` next to every `<p role="alert">` error message. The button appears inline with the error text.

**Alternatives considered:**
- Global retry via ErrorBoundary only — rejected because API errors are recoverable without full-page reset.
- Auto-retry with backoff — rejected because it masks persistent failures and delays user diagnosis.
- Icon-only retry button — rejected because "Retry" text is more accessible.

### 3. Error boundary

**Decision:** A single `ErrorBoundary` class component in `client/src/components/ErrorBoundary.tsx` wrapping the `<Routes>` content in `App.tsx`. It catches unhandled errors during render, shows a styled message ("Something went wrong") with a "Reload page" button, and logs the error to console. The boundary does NOT catch errors inside event handlers or async code (standard React behavior).

**Placement:** Inside `<ThemeProvider>` and `<BrowserRouter>` in `main.tsx`, wrapping `<App />` so the error page inherits the theme. Alternatively, wrapping `<Routes>` inside `App.tsx` so the header/nav remain visible — but that risks the header itself crashing. Wrap the full App for safety.

### 4. Tooltip component

**Decision:** Use `@base-ui/react/tooltip` with a custom `Tooltip` wrapper component (`client/src/components/Tooltip.tsx`). The wrapper accepts `content: string` and `children`, renders children normally, and shows the tooltip on hover/focus when the child's text is truncated.

**Usage pattern at each truncation site:**
- `WorkCard` author name (line 37): `{firstAuthor && <Tooltip content={firstAuthor.name}><p className="truncate ...">{firstAuthor.name}</p></Tooltip>}`
- `SeriesDetail` author name (line 86)
- `GlobalSearch` result titles (lines 278, 281) and recent searches (line 241)
- `BottomNav` nav labels (line 29)
- `Stats` most-annotated works (line 380)

**Alternatives considered:**
- CSS-only `title` attribute — rejected because native tooltips have zero styling control, no dark mode support, and variable delay.
- `@radix-ui/react-tooltip` — rejected because it requires adding a new dependency when `@base-ui/react/tooltip` is already available.
- Manual `useState` + Portal — rejected because Base UI handles positioning, focus management, and accessibility correctly out of the box.

### 5. Broken cover fallback (img onError)

**Decision:** At each `<img>` for cover images, wrap in a small stateful component or use inline `onError` with state to track load failure. When `onError` fires, set `hasError: true` and render the existing "No cover" placeholder div instead.

**Locations (6 sites):**
- `WorkCard.tsx:19-25`
- `WorkDetail.tsx:48-53`
- `CopyDetail.tsx:55-60`
- `AuthorDetail.tsx:60-66`
- `SeriesDetail.tsx:77-79` (mini cover variant)
- `AddBook.tsx:554-565` (cover preview)

**Implementation:** Create a `CoverImage` component (`client/src/components/CoverImage.tsx`) accepting `src`, `alt`, `className`, and an optional `variant` ("card", "detail", "mini"). It manages `onError` state internally and renders the appropriate fallback. This avoids duplicating the pattern 6 times and keeps the "No cover" styling consistent. The fallback matches the existing styling at each site (aspect-ratio, border, shadow).

**Alternative considered:** Inline `onError` + local `useState` at each site — rejected because it duplicates 6 copies of identical logic.

### 6. Missing ISBN display

**Decision:** On `EditionDetail.tsx:72-77`, change the conditional from:

```tsx
{edition.isbn && (
  <div>...</div>
)}
```

to always show the row but vary the value:

```tsx
<div>
  <span className="text-xs font-medium text-muted-foreground">ISBN</span>
  <p className="text-sm tabular-nums">{edition.isbn || "—"}</p>
</div>
```

This is a one-line logic change. The `—` (em dash) is the established convention for missing-data display, already used in the SeriesDetail mini-cover placeholder.

### 7. Unknown author display

**Decision:** At each location that currently guards with `{firstAuthor && (...)}` or `{work.authors_meta && work.authors_meta.length > 0 && (...)}`, change to always show the author line. When empty, show `<span className="text-muted-foreground">Unknown author</span>`.

**Locations:**
- `WorkCard.tsx:36-38` — author line under title
- `WorkDetail.tsx:65-76` — author links in metadata block
- `SeriesDetail.tsx:85-87` — author line under title

**Alternative considered:** Hiding the line entirely (current behavior) — rejected because it makes zero-author works indistinguishable from works whose author data simply hasn't loaded yet, and provides no cue that data needs attention.

### 8. Large-library performance test

**Decision:** Create `server/src/lib/index-perf.test.ts` — a vitest test that:
1. Creates a temp directory with the standard entity subdirectories
2. Generates N entity files programmatically (default 1200: 100 authors, 200 series, 500 works, 200 editions, 200 copies)
3. Times `new Index(tmpDir).load()` and asserts <2000ms
4. Times a filtered work lookup (genre filter equivalent) and asserts <100ms

**File generation:** Use the existing `writeFile` helper from `io.ts`. Generate deterministic data with loop counters (e.g., `author-${i}`, `work-${i}`). Each work links to 1 random author and optionally a series. Editions link to works. Copies link to editions and works.

**Alternative considered:** Shell script like `seed-test-data.sh` — rejected because a vitest test is self-contained, runs as part of `npm test`, enforces assertions, and doesn't depend on a library path environment variable.

## Risks / Trade-offs

- **[Skeleton flash]** If data loads faster than the skeleton renders, the skeleton may flash briefly. → Mitigation: The hooks set `loading: true` immediately, and the skeleton condition is `if (loading)`. Only the first render shows skeleton; subsequent refetches keep the existing data visible (hooks don't reset data on refetch).
- **[Tooltip bundle size]** `@base-ui/react/tooltip` adds a popup/portal/positioner tree. → Mitigation: These modules are already tree-shaken into the bundle from the `Dialog` usage. The tooltip adds minimal incremental cost.
- **[Performance test flakiness]** Sub-2-second load time is hardware-dependent. → Mitigation: Use generous margins (assert <2000ms on a workload that loads in ~200ms locally). If CI is slower, the threshold can be raised. The test documents the performance characteristic rather than enforcing a hard cap.
- **[img onError doesn't retry]** Once a cover image fails to load, it stays on the placeholder until page refresh. → Mitigation: This is acceptable — the `refetch` function already reloads the entity data, and a page navigation will re-mount the image. A manual retry for images specifically is out of scope.
