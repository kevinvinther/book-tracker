## 1. Shared Components

- [x] 1.1 Create `Skeleton` component (`client/src/components/Skeleton.tsx`) — renders an `animate-pulse bg-muted rounded-sm` div with configurable `className`, respecting `prefers-reduced-motion`
- [x] 1.2 Create `Tooltip` component (`client/src/components/Tooltip.tsx`) — wraps `@base-ui/react/tooltip`, accepts `content: string` and `children`
- [x] 1.3 Create `CoverImage` component (`client/src/components/CoverImage.tsx`) — renders `<img>` with `onError` fallback to "No cover" placeholder; accepts `src`, `alt`, `className`, and optional `variant` ("card" | "detail" | "mini")
- [x] 1.4 Create `ErrorBoundary` component (`client/src/components/ErrorBoundary.tsx`) — React class component catching render errors, displaying "Something went wrong" with a "Reload page" button, logging to console

## 2. Error Handling

- [x] 2.1 Wire `ErrorBoundary` into `main.tsx` wrapping `<App />` (inside `<ThemeProvider>` and `<BrowserRouter>`)
- [x] 2.2 Add "Retry" button alongside each `<p role="alert">` error in `WorkGrid.tsx`, calling `refetch`
- [x] 2.3 Add "Retry" button alongside error in `WorkDetail.tsx`
- [x] 2.4 Add "Retry" button alongside error in `AuthorDetail.tsx`
- [x] 2.5 Add "Retry" button alongside error in `SeriesDetail.tsx`
- [x] 2.6 Add "Retry" button alongside error in `EditionDetail.tsx`
- [x] 2.7 Add "Retry" button alongside error in `CopyDetail.tsx`
- [x] 2.8 Wire the `error` and `refetch` state from `useSearch` into `GlobalSearch.tsx` — display "Search failed" with "Retry" button in the dropdown when search errors

## 3. Loading States

- [x] 3.1 Replace the invisible loading state in `WorkGrid.tsx` with a 10-card grid of `<Skeleton>`
- [x] 3.2 Replace "Loading…" text in `WorkDetail.tsx` with a skeleton layout
- [x] 3.3 Replace "Loading…" text in `AuthorDetail.tsx` with a skeleton layout
- [x] 3.4 Replace "Loading…" text in `SeriesDetail.tsx` with a skeleton layout
- [x] 3.5 Replace "Loading…" text in `EditionDetail.tsx` with a skeleton layout
- [x] 3.6 Replace "Loading…" text in `CopyDetail.tsx` with a skeleton layout
- [x] 3.7 Upgrade Stats page loading from "Loading stats..." text to `<Skeleton>` blocks

## 4. Edge Case Displays

- [x] 4.1 In `WorkCard.tsx`: when `firstAuthor` is falsy, show "Unknown author"
- [x] 4.2 In `WorkDetail.tsx`: when `authors_meta` is empty/null, show "Unknown author"
- [x] 4.3 In `SeriesDetail.tsx`: when `firstAuthor` is falsy, show "Unknown author"
- [x] 4.4 In `EditionDetail.tsx`: change ISBN display to always show row with `"—"`

## 5. Tooltip Wiring

- [x] 5.1 Wrap the truncated author name in `WorkCard.tsx` with `<Tooltip>`
- [x] 5.2 Wrap the truncated author name in `SeriesDetail.tsx` with `<Tooltip>`
- [x] 5.3 Wrap truncated result titles in `GlobalSearch.tsx` with `<Tooltip>`
- [x] 5.4 Wrap truncated nav labels in `BottomNav.tsx` with `<Tooltip>`
- [x] 5.5 Wrap truncated work titles in Stats ranked lists with `<Tooltip>`

## 6. Cover Image Fallback

- [x] 6.1 Replace the cover in `WorkCard.tsx` with `<CoverImage>`
- [x] 6.2 Replace the cover in `WorkDetail.tsx` with `<CoverImage>`
- [x] 6.3 Replace the cover in `CopyDetail.tsx` with `<CoverImage>`
- [x] 6.4 Replace the cover in `AuthorDetail.tsx` with `<CoverImage>`
- [x] 6.5 Replace the cover in `SeriesDetail.tsx` with `<CoverImage>`
- [x] 6.6 Replace the cover preview in `AddBook.tsx` with `<CoverImage>`

## 7. Large Library Performance Test

- [x] 7.1 Create `server/src/lib/index-perf.test.ts` — vitest performance test for 1000+ entity index

## 8. Verification

- [x] 8.1 Run `npm test` — all server tests pass, including the new performance test
- [ ] 8.2 Manually verify: empty library shows skeleton then empty state; library with data shows skeleton on navigation then content; broken cover URLs show placeholder; missing ISBN shows "—"; zero-author works show "Unknown author"
- [ ] 8.3 Manually verify: truncated text shows tooltip on hover; "Retry" buttons re-fetch on click; GlobalSearch shows error with retry on API failure
- [x] 8.4 Run `npm run lint` in client — no new lint errors