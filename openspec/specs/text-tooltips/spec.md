# text-tooltips Specification

## Purpose
Tooltip component using `@base-ui/react/tooltip` for revealing truncated text across work cards, series lists, search results, nav labels, and stats.

## Requirements
### Requirement: Tooltip component wraps truncated text
The application SHALL provide a `Tooltip` component built on `@base-ui/react/tooltip` that displays a hover tooltip revealing the full text of any truncated child element.

#### Scenario: Tooltip appears on hover
- **WHEN** the user hovers over an element wrapped in `<Tooltip content="full text">`
- **THEN** a tooltip appears near the element displaying the full content text

#### Scenario: Tooltip appears on keyboard focus
- **WHEN** the user tabs to focus an element wrapped in `<Tooltip>`
- **THEN** the tooltip appears near the element displaying the full content text

#### Scenario: Tooltip closes on mouse leave
- **WHEN** the user moves the mouse away from the tooltip trigger element
- **THEN** the tooltip disappears

### Requirement: Tooltips on truncated work card author names
The work grid card SHALL show a tooltip on the truncated author name, revealing the full author name on hover.

#### Scenario: Hovering truncated author name
- **WHEN** a work card's author name is truncated via CSS and the user hovers over it
- **THEN** a tooltip displays the full author name

### Requirement: Tooltips on truncated series detail author names
The series detail page SHALL show a tooltip on each work's truncated author name.

#### Scenario: Hovering truncated author name in series list
- **WHEN** a series work entry's author name is truncated and the user hovers over it
- **THEN** a tooltip displays the full author name

### Requirement: Tooltips on truncated search result text
The global search results dropdown SHALL show tooltips on truncated result titles and subtitles.

#### Scenario: Hovering truncated search result title
- **WHEN** a search result's title is truncated and the user hovers over it
- **THEN** a tooltip displays the full title

#### Scenario: Hovering truncated search result subtitle
- **WHEN** a search result's subtitle is truncated and the user hovers over it
- **THEN** a tooltip displays the full subtitle

#### Scenario: Hovering truncated recent search query
- **WHEN** a recent search button's text is truncated and the user hovers over it
- **THEN** a tooltip displays the full query text

### Requirement: Tooltips on truncated bottom navigation labels
The mobile bottom navigation bar SHALL show tooltips on truncated nav labels.

#### Scenario: Hovering truncated nav label
- **WHEN** a bottom nav label is truncated and the user hovers over it (or long-presses on touch)
- **THEN** a tooltip displays the full label text

### Requirement: Tooltips on truncated stats labels
The stats page SHALL show tooltips on any truncated work titles in ranked lists.

#### Scenario: Hovering truncated work title in stats
- **WHEN** a ranked work title in the stats page is truncated and the user hovers over it
- **THEN** a tooltip displays the full title
