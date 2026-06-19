## Context

The backend exposes `GET /api/stats` (computing library snapshot, reading stats, and note stats from the in-memory index) and `GET /api/series` (listing all series with their names). No frontend exists to display this data. The client uses React + TypeScript + Tailwind + react-router-dom, with a consistent page/hook pattern (loading, error, notFound states). Navigation is a simple header with two links. The design system is a card-catalog theme with custom CSS variables for colors.

## Goals / Non-Goals

**Goals:**
- Display all stats categories (library, reading, notes) on a single `/stats` page
- Use recharts for visual bar/line charts alongside metric cards and ranked lists
- Support time range selection: This Year, Last Year, All Time, Custom (native date inputs)
- Resolve series slugs to display names and ISO 639-1 codes to readable language names
- Follow existing frontend patterns: custom hook → state management → page component
- Add header navigation link for desktop discovery

**Non-Goals:**
- Bottom navigation bar (deferred to mobile responsiveness)
- Modifying the stats backend endpoint
- Adding date-picker library dependencies (native `<input type="date">` for custom range)
- Write operations or data mutations from this page
- Mobile-specific responsive optimizations (handled by the existing responsive layout)

## Decisions

### 1. Library choice: recharts over alternatives

**Chosen:** recharts. It is the most popular React charting library, has a declarative/composable API, supports bar charts (vertical and horizontal), line charts, and custom tooltips/axes. It renders SVG so it respects Tailwind's color system via inline styles. Alternatives considered:
- **react-chartjs-2**: Canvas-based; harder to style with CSS variables. Less idiomatic React integration.
- **visx**: Too low-level for this use case; recharts' ready-made components (`<BarChart>`, `<LineChart>`) avoid unnecessary boilerplate.
- **nivo**: Heavier bundle; recharts is simpler for the chart types needed here.

### 2. Chart type assignment

- **Vertical bar charts** (`<BarChart>`): copies_by_format, copies_by_status, copies_by_condition, copies_by_language, works_by_language, works_by_series — categories are few and labels are short.
- **Horizontal bar charts** (`<BarChart layout="vertical">`): works_by_genre, avg_rating_by_work, avg_rating_by_author — labels can be long (genre names, full titles); horizontal layout avoids label truncation.
- **Line/bar chart** (`<LineChart>` or `<BarChart>`): notes_per_month — time series data. Bar chart is preferred for discrete monthly counts; line chart if the range spans many months.
- **Ranked list** (plain HTML ordered list): most_annotated_works — the `?limit=` param controls count; a ranked list with number prefixes and bar indicators is more natural than a chart for a short top-N.

### 3. Language charts: two dimensions

Two language charts are shown side by side in the Library section:
- **Copies by Language**: resolves `edition.language` per copy (via the copy's edition wikilink). Answers "what languages are my books in?"
- **Works by Original Language**: uses `work.original_language`. Answers "what languages were these works originally written in?"

Both resolve ISO 639-1 (`en`, `fr`) and ISO 639-2/B (`eng`, `fre`) codes to display names via the inline lookup table. Format and language are both resolved from the edition, not stored on the copy.

### 4. Metric cards as a reusable sub-component

Summary numbers (total works, finished count, etc.) share the same visual card treatment: large number, small muted label below. Extracting a `<MetricCard>` component avoids repeating the same JSX 9 times. It takes `value: number | string` and `label: string`.

### 5. Display name resolution strategy

The stats endpoint returns raw identifiers (series slugs, ISO 639-1 language codes). Resolution happens client-side:
- **Series**: `useStats` also fetches `GET /api/series` and builds a `Map<string, string>` (slug → name). The series list is small (typically < 20 entries).
- **Languages**: A static inline lookup table maps ~20 common book languages (`en` → "English", `fr` → "French", etc.). Unknown codes are displayed as-is. No API call needed.

### 6. Time range selector: pure client state

The selector is a row of buttons (This Year / Last Year / All Time / Custom). Selection sets local state; when "Custom" is active, two `<input type="date">` fields appear. The `useStats` hook is called with computed query params (`?year=`, `?from=&to=`, or no params for all-time). Changing the range triggers a refetch. No calendar library needed — native date inputs are sufficient and work across desktop and mobile.

### 7. Hook pattern: follows existing conventions

`useStats(rangeParams)` returns `{ data, loading, error, refetch }`. It mirrors `useWork`, `useWorks`, etc. — `useState` for state fields, `useCallback`+`useEffect` for fetching with cancellation. Additionally, it fetches series data once on mount (cached in a ref to avoid re-fetching on every range change). The combined result exposes resolved display names alongside raw stats data.

### 8. Color scheme for charts

Charts use the Tailwind/OKLCH color variables from `index.css`: `--color-primary` (stamp red) as the primary bar/fill color, `--color-verdigris` as an accent, and `--color-muted` for grid lines and axis labels. The recharts `<ResponsiveContainer>` makes charts fill their parent width.

## Risks / Trade-offs

- **recharts bundle size**: recharts + d3 dependencies add ~150KB gzipped. Mitigation: only import used components (`BarChart`, `Bar`, `LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`, `CartesianGrid`, `Cell`, `Legend`). Tree-shaking by Vite should remove unused recharts modules.
- **Extra `/api/series` fetch**: The stats page makes two API calls instead of one (stats + series). Mitigation: the series list is small and cached in a ref; it's fetched once per mount, not on every range change. Acceptable for a local-only app.
- **Language code coverage**: The inline lookup table covers ~30 languages with both ISO 639-1 (two-letter) and ISO 639-2/B (three-letter) code aliases. If a user enters an uncommon code (e.g., `sw` for Swahili), the raw code is shown. Degradation is graceful — just shows the code instead of a name.

## Open Questions

None.
