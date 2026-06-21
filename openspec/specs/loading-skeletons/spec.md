# loading-skeletons Specification

## Purpose
Reusable Skeleton component and loading state patterns for grid, detail pages, and stats page.

## Requirements
### Requirement: Skeleton component primitive
The application SHALL provide a reusable `Skeleton` component that renders an animated placeholder block using `animate-pulse` with a muted background and rounded corners.

#### Scenario: Skeleton renders as animated block
- **WHEN** a `Skeleton` component is mounted
- **THEN** it renders a `<div>` with `animate-pulse bg-muted rounded-sm` and the dimensions specified via `className`

#### Scenario: Skeleton respects reduced motion
- **WHEN** the user's system preference is `prefers-reduced-motion: reduce`
- **THEN** the skeleton animation is disabled and the block renders statically

### Requirement: Work grid skeleton loading state
The work grid SHALL display a grid of card-shaped skeleton placeholders while works are loading, instead of plain text.

#### Scenario: Initial load shows skeletons
- **WHEN** the user navigates to `/` and `GET /api/works` is pending
- **THEN** a grid of 10 skeleton cards is displayed, each matching the `WorkCard` aspect ratio of `[2/3]`

#### Scenario: Skeleton grid has accessible label
- **WHEN** the skeleton grid is displayed
- **THEN** the container has `aria-busy="true"` and `aria-label="Loading books"`

#### Scenario: Card-reveal animation suppressed during skeleton
- **WHEN** the skeleton grid is displayed
- **THEN** the `card-reveal` CSS animation is not applied

#### Scenario: Skeletons replaced by real cards on load
- **WHEN** `GET /api/works` resolves successfully
- **THEN** the skeleton grid is replaced by the actual `WorkCard` grid with the normal `card-reveal` animation

### Requirement: Detail page skeleton loading state
All detail pages (Work, Author, Series, Edition, Copy) SHALL display a structured skeleton layout matching the page's content blocks while data loads, instead of "Loading…" text.

#### Scenario: Work detail loading shows skeleton
- **WHEN** the user navigates to `/works/:slug` and data is loading
- **THEN** a skeleton layout is displayed with blocks matching the cover image area, title line, subtitle line, author line, and editions section

#### Scenario: Author detail loading shows skeleton
- **WHEN** the user navigates to `/authors/:slug` and data is loading
- **THEN** a skeleton layout is displayed with blocks matching the author name line, aliases line, and works grid

#### Scenario: Edition detail loading shows skeleton
- **WHEN** the user navigates to `/editions/:slug` and data is loading
- **THEN** a skeleton layout is displayed with blocks matching the title, metadata fields, and copies list

#### Scenario: Copy detail loading shows skeleton
- **WHEN** the user navigates to `/copies/:slug` and data is loading
- **THEN** a skeleton layout is displayed with blocks matching the cover image, title, metadata lines, and sections for read-through history, loans, and notes

### Requirement: Stats page loading preserves existing skeleton
The Stats page SHALL retain its existing loading display pattern (dedicated full-page loading state), upgraded to use the `Skeleton` component with layout-matched blocks instead of plain text.

#### Scenario: Stats loading shows skeleton blocks
- **WHEN** the user navigates to `/stats` and data is loading
- **THEN** skeleton blocks are displayed matching the stats card, chart, and breakdown sections
