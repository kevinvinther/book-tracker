## ADDED Requirements

### Requirement: Skip-to-content link

The app SHALL provide a "Skip to main content" link as the first focusable element in the page. The link SHALL be visually hidden until it receives focus, at which point it SHALL become visible and allow keyboard users to bypass the header navigation and search bar.

#### Scenario: Skip link is available on every page

- **WHEN** any page loads and the user presses Tab
- **THEN** a "Skip to main content" link becomes visible and receives focus
- **AND** activating the link moves focus to the `<main>` element

#### Scenario: Skip link is hidden when not focused

- **WHEN** the skip link does not have focus
- **THEN** the link SHALL be visually hidden but remain accessible to screen readers

### Requirement: Heading hierarchy

Every page SHALL have exactly one `<h1>` as the primary page heading. Sections within a page SHALL use `<h2>` headings. Subsections SHALL use `<h3>`. No heading level SHALL be skipped (e.g., `<h1>` directly to `<h3>` without an `<h2>` is not permitted).

#### Scenario: WorkGrid page heading structure

- **WHEN** the WorkGrid page renders with no search query or filters active
- **THEN** it SHALL display an `<h1>` heading (e.g., "My Books" or "Library")
- **AND** filter and sort controls SHALL NOT use heading elements unless they introduce a distinct page section

#### Scenario: WorkDetail page heading structure

- **WHEN** the WorkDetail page renders
- **THEN** the work title SHALL be the `<h1>`
- **AND** each section (Description, Editions, Recent Notes) SHALL use `<h2>`
- **AND** individual copy cards SHALL NOT use heading elements

#### Scenario: Modal heading structure

- **WHEN** a modal dialog opens
- **THEN** the dialog title SHALL be rendered as an `<h2>` via `Dialog.Title`

### Requirement: Landmark labeling

Every `<nav>` element SHALL have an accessible name (via `aria-label` or `aria-labelledby`) when multiple `<nav>` elements exist on the same page, to distinguish primary navigation from secondary navigation.

#### Scenario: Multiple nav landmarks on mobile

- **WHEN** the page is viewed on a mobile screen and both the header `<nav>` and bottom navigation `<nav>` are present
- **THEN** each `<nav>` SHALL have a unique `aria-label` (e.g., "Main navigation" and "Page navigation")

### Requirement: Keyboard-operable interactive elements

Every interactive element SHALL be reachable via the Tab key and operable via standard keyboard activation (Enter or Space for buttons, Enter for links, Space to toggle, Escape to close). No functionality SHALL be locked behind mouse-only interaction.

#### Scenario: Table row activation

- **WHEN** a PageLogTable or LoanHistory table contains rows with `onClick` handlers for editing
- **THEN** each interactive row SHALL have `tabIndex={0}` and respond to Enter or Space key presses with the same action as the click handler

#### Scenario: Modal dismissal

- **WHEN** any modal dialog is open
- **THEN** pressing Escape SHALL close the modal and restore focus to the element that triggered it

#### Scenario: AuthorSelector dropdown navigation

- **WHEN** the AuthorSelector dropdown is expanded and the input has focus
- **THEN** ArrowDown and ArrowUp keys SHALL move the highlighted option through the list
- **AND** Enter key SHALL select the highlighted option
- **AND** Escape key SHALL close the dropdown without selecting

#### Scenario: GenreSelector dropdown navigation

- **WHEN** the GenreSelector dropdown is expanded and the input has focus
- **THEN** ArrowDown and ArrowUp keys SHALL move the highlighted option through the list
- **AND** Enter key SHALL select the highlighted option
- **AND** Escape key SHALL close the dropdown without selecting

#### Scenario: Global search keyboard shortcut

- **WHEN** the user presses Ctrl+K or Cmd+K (or `/` outside of a text input)
- **THEN** the global search input SHALL receive focus and the search panel SHALL open

### Requirement: Visible focus indicators

Every interactive element SHALL display a visible focus indicator when it receives keyboard focus. The focus indicator SHALL have sufficient contrast against the surrounding background (minimum 3:1 contrast ratio against both adjacent colors).

#### Scenario: Focus ring on buttons

- **WHEN** a button receives keyboard focus
- **THEN** a visible ring or outline SHALL appear around the button

#### Scenario: Focus ring on links

- **WHEN** a link receives keyboard focus
- **THEN** a visible ring or outline SHALL appear around the link

#### Scenario: Focus ring on form inputs

- **WHEN** a text input, select, textarea, or checkbox receives keyboard focus
- **THEN** a visible ring or border change SHALL indicate focus

### Requirement: Form input labels

Every form input (`<input>`, `<select>`, `<textarea>`) SHALL have an accessible name provided by an associated `<label>` element, `aria-label`, or `aria-labelledby`. The accessible name SHALL describe the purpose of the input.

#### Scenario: Explicit label association in forms

- **WHEN** a form input is rendered within a `<label>` element with a `<span>` label text
- **THEN** clicking the label text SHALL focus the associated input

#### Scenario: Inline editing inputs in table cells

- **WHEN** inputs are rendered inside `<td>` cells for inline editing (PageLogTable, LoanHistory)
- **THEN** each input SHALL have an `aria-label` describing its purpose (e.g., "Page number", "Date", "Borrower name")

#### Scenario: WorkGrid search input

- **WHEN** the WorkGrid page renders
- **THEN** the search input SHALL have an accessible name via `<label>`, `aria-label`, or `aria-labelledby`

#### Scenario: Stats custom date inputs

- **WHEN** the Stats page renders with a custom date range selected
- **THEN** the "From" and "To" date inputs SHALL each have an accessible name

#### Scenario: Settings genres textarea

- **WHEN** the Settings page renders
- **THEN** the genres textarea SHALL have an associated `<label>` element

### Requirement: Error announcements

Error messages displayed after form validation SHALL be announced to screen readers using `role="alert"` so the user is immediately notified of the problem.

#### Scenario: Form validation error

- **WHEN** a user submits a form with missing or invalid fields
- **THEN** the error message SHALL be rendered inside an element with `role="alert"`
- **AND** a screen reader SHALL announce the error message without the user needing to navigate to it

#### Scenario: Inline form error

- **WHEN** a page log entry is submitted with an invalid page number (e.g., non-numeric)
- **THEN** the error message SHALL be rendered inside an element with `role="alert"` or inside a container with `aria-live="polite"`

### Requirement: Dynamic content announcements

Dynamic content updates that are not errors (search results, loading states, success messages) SHALL be announced using `aria-live="polite"` regions so screen readers can inform the user without interrupting their current task.

#### Scenario: Search results update

- **WHEN** the user types in the global search and results appear or change
- **THEN** the search results region SHALL be wrapped in an element with `aria-live="polite"`
- **AND** the result count or status SHALL be announced

#### Scenario: Success message

- **WHEN** a save operation completes successfully and a success message is displayed (e.g., "Settings saved")
- **THEN** the success message SHALL be wrapped in an element with `aria-live="polite"` or `role="status"`

### Requirement: Toggle button states

Buttons that represent on/off or selected/unselected states SHALL communicate their state using `aria-pressed`. Filter buttons that represent the currently active selection SHALL use `aria-current`.

#### Scenario: Write/Preview toggle

- **WHEN** the NoteEditorModal renders with the Write tab active
- **THEN** the Write button SHALL have `aria-pressed="true"`
- **AND** the Preview button SHALL have `aria-pressed="false"`

#### Scenario: Genre filter buttons

- **WHEN** the WorkGrid page renders with a genre filter active (e.g., "fiction")
- **THEN** the active genre button SHALL have `aria-current="true"` or `aria-pressed="true"`
- **AND** inactive genre buttons SHALL have `aria-pressed="false"` or no `aria-pressed` attribute

#### Scenario: Time range presets

- **WHEN** the Stats page renders with "This Year" selected
- **THEN** the "This Year" button SHALL have `aria-pressed="true"` or `aria-current="true"`
- **AND** other preset buttons SHALL have `aria-pressed="false"`

### Requirement: Accessible names on icon-only controls

Every interactive element that contains only an icon (SVG) and no visible text SHALL have an `aria-label` describing its action. Decorative SVG icons within interactive elements SHALL have `aria-hidden="true"`.

#### Scenario: Icon-only buttons

- **WHEN** a button contains only an SVG icon with no visible label text
- **THEN** the button SHALL have an `aria-label` describing the action (e.g., "Remove", "Edit", "Delete")

#### Scenario: Decorative icons in labeled buttons

- **WHEN** a button contains both an SVG icon and visible text
- **THEN** the SVG icon SHALL have `aria-hidden="true"` to prevent redundant announcement

#### Scenario: Remove chip button

- **WHEN** the AuthorSelector or GenreSelector renders a selected item with a "×" remove button
- **THEN** the remove button SHALL have `aria-label="Remove <item name>"` (e.g., `aria-label="Remove Fyodor Dostoevsky"`)

### Requirement: Image alt text

Every `<img>` element SHALL have an `alt` attribute. For meaningful images (cover photos), the alt text SHALL describe the image content. For decorative images, the alt attribute SHALL be empty (`alt=""`).

#### Scenario: Work cover image on WorkGrid card

- **WHEN** a WorkCard renders with a cover image
- **THEN** the `<img>` SHALL have `alt="Cover of <work title>"`

#### Scenario: Copy cover image on CopyDetail

- **WHEN** the CopyDetail page renders with a cover image
- **THEN** the `<img>` SHALL have `alt="Cover of <work title>"` (not a generic label like "Copy cover")

#### Scenario: Missing cover image

- **WHEN** a WorkCard renders without a cover image
- **THEN** a placeholder SHALL be displayed with accessible text (e.g., "No cover" as visible text or `alt=""` with adjacent text)

### Requirement: Custom combobox ARIA

The AuthorSelector and GenreSelector components SHALL implement the WAI-ARIA combobox pattern with `role="combobox"`, `role="listbox"`, `role="option"`, `aria-expanded`, and `aria-activedescendant` to communicate their state and options to assistive technology.

#### Scenario: Combobox initial state

- **WHEN** the AuthorSelector renders with the dropdown closed
- **THEN** the input SHALL have `role="combobox"` and `aria-expanded="false"`
- **AND** the input SHALL have `aria-haspopup="listbox"`

#### Scenario: Combobox expanded state

- **WHEN** the AuthorSelector input receives focus and the dropdown opens
- **THEN** the input SHALL have `aria-expanded="true"`
- **AND** the dropdown SHALL have `role="listbox"`
- **AND** each option SHALL have `role="option"` and a unique `id`

#### Scenario: Combobox keyboard navigation

- **WHEN** the user presses ArrowDown while the combobox is expanded
- **THEN** the active option SHALL move to the next item
- **AND** the input's `aria-activedescendant` SHALL update to the new option's `id`

### Requirement: Modal focus management

When a modal dialog opens, focus SHALL move to the first focusable element inside the dialog. When the dialog closes, focus SHALL return to the element that triggered the dialog. The dialog SHALL trap focus so Tab and Shift+Tab cycle through only the dialog's interactive elements.

#### Scenario: Edit modal opens

- **WHEN** an EditWorkModal, EditCopyModal, or similar edit modal opens
- **THEN** the first form field (input, select, or textarea) SHALL receive focus

#### Scenario: Confirm dialog opens

- **WHEN** a ConfirmDialog opens for a destructive action
- **THEN** focus SHALL move to the Cancel button (the safer default action)
- **AND** Tab cycles through Cancel and Confirm buttons only

#### Scenario: Modal closes

- **WHEN** a modal is dismissed (via Escape, Cancel button, or clicking the backdrop)
- **THEN** focus SHALL return to the button or element that opened the modal

### Requirement: Chart accessibility

Chart components on the Stats page SHALL be perceivable by screen readers. Each chart container SHALL have `role="img"` and an `aria-label` that summarizes the chart's data.

#### Scenario: Bar chart rendered

- **WHEN** the Stats page renders a bar chart (e.g., books per month)
- **THEN** the chart container SHALL have `role="img"`
- **AND** the `aria-label` SHALL describe the chart type and summarize the data (e.g., "Bar chart: Books read per month. January: 2, February: 1")

#### Scenario: Empty chart

- **WHEN** a ChartContainer renders with no data
- **THEN** the empty state text SHALL be accessible to screen readers without additional ARIA

### Requirement: Color contrast WCAG AA

All text and interactive elements SHALL meet WCAG 2.1 AA contrast minimums: 4.5:1 for normal text (under 18pt / 24px), 3:1 for large text (18pt+ bold or 24px+), and 3:1 for UI components and graphical objects.

#### Scenario: Body text on card background

- **WHEN** text uses the `foreground` color on the `card` background
- **THEN** the contrast ratio SHALL be at least 4.5:1

#### Scenario: Muted/placeholder text

- **WHEN** text uses the `muted-foreground` color on the `background` or `card` background
- **THEN** the contrast ratio SHALL be at least 4.5:1

#### Scenario: Button text on primary/destructive backgrounds

- **WHEN** a button uses `variant="destructive"` or `className="bg-stamp"`
- **THEN** the text color on the button background SHALL have a contrast ratio of at least 4.5:1

### Requirement: Accessibility linting

The project SHALL include `eslint-plugin-jsx-a11y` as a dev dependency with a configuration that enables the plugin's recommended rules. Linting SHALL run as part of the development workflow.

#### Scenario: Missing alt text lint

- **WHEN** an `<img>` element is written without an `alt` attribute
- **THEN** ESLint SHALL report a warning or error

#### Scenario: Missing label lint

- **WHEN** a form input is written without an associated `<label>`, `aria-label`, or `aria-labelledby`
- **THEN** ESLint SHALL report a warning or error

### Requirement: Runtime accessibility checks in development

The app SHALL include `@axe-core/react` initialized in development mode only, logging accessibility violations to the browser console so issues can be caught during manual testing.

#### Scenario: Axe reports violations

- **WHEN** the app runs in development mode and a component renders with an accessibility violation
- **THEN** a warning SHALL be logged to the browser console describing the violation and the affected element

#### Scenario: Axe is disabled in production

- **WHEN** the app is built for production
- **THEN** `@axe-core/react` SHALL NOT be initialized and SHALL NOT log to the console
