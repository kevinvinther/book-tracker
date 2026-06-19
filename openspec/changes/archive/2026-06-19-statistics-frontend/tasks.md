## 1. Setup

- [x] 1.1 Add recharts dependency to `client/package.json` (`npm install recharts`)
- [x] 1.2 Add `StatsResponse` type and related sub-types to `client/src/lib/types.ts`
- [x] 1.3 Add `/stats` route and lazy-imported `<Stats />` page to `client/src/App.tsx`
- [x] 1.4 Add "Stats" link to header navigation in `client/src/App.tsx`, between "Book Tracker" and "Settings"

## 2. Data Layer

- [x] 2.1 Create `client/src/hooks/useStats.ts` — fetches `GET /api/stats` with range params + `GET /api/series`, returns combined result with resolved series names
- [x] 2.2 Create `client/src/lib/languages.ts` — inline lookup table mapping ISO 639-1 codes to English display names (~20 common book languages), with a `languageName(code: string): string` function that falls back to the raw code

## 3. Reusable Components

- [x] 3.1 Create `<MetricCard>` component — large number + muted label, styled with the card-catalog theme
- [x] 3.2 Create `<ChartContainer>` wrapper — consistent chart sizing, responsive container, section heading, empty-state handling

## 4. Time Range Selector

- [x] 4.1 Create time range selector component with preset buttons (This Year / Last Year / All Time / Custom)
- [x] 4.2 Wire custom date range with native `<input type="date">` fields that appear when "Custom" is selected
- [x] 4.3 Compute query params from selection and pass to `useStats` hook, triggering refetch on change

## 5. Library Snapshot Section

- [x] 5.1 Render metric cards for `total_works`, `total_editions`, `total_copies`
- [x] 5.2 Render vertical bar chart for `copies_by_format`
- [x] 5.3 Render vertical bar chart for `copies_by_status`
- [x] 5.4 Render vertical bar chart for `copies_by_condition`
- [x] 5.5 Render horizontal bar chart for `works_by_genre`
- [x] 5.6 Render vertical bar chart for `works_by_language` (using resolved language names)
- [x] 5.7 Render vertical bar chart for `works_by_series` (using resolved series names)

## 6. Reading Stats Section

- [x] 6.1 Render metric cards for `finished_count`, `currently_reading_count`, `total_pages_read`, `avg_pages_per_day`, `copies_acquired`
- [x] 6.2 Render horizontal bar chart for `avg_rating_by_work`
- [x] 6.3 Render horizontal bar chart for `avg_rating_by_author`
- [x] 6.4 Handle zero-ratings case: show empty state message when no ratings exist

## 7. Notes Stats Section

- [x] 7.1 Render metric card for `total_notes`
- [x] 7.2 Render bar chart for `notes_per_month` (chronologically sorted YYYY-MM labels)
- [x] 7.3 Render ranked list for `most_annotated_works` with number prefix and note counts
- [x] 7.4 Handle zero-notes case: show empty state message when no notes exist

## 8. Page Assembly

- [x] 8.1 Compose all sections into `client/src/pages/Stats.tsx` with loading, error, and empty-library states
- [x] 8.2 Verify the page renders correctly in both light and dark modes
- [x] 8.3 Verify all chart interactions work (tooltips, responsive resize)
