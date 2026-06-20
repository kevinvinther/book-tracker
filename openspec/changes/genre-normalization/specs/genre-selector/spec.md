## ADDED Requirements

### Requirement: GenreSelector component

The system SHALL provide a `GenreSelector` React component that allows users to select genres from a curated vocabulary via autocomplete. It SHALL follow the same pattern as the existing `AuthorSelector` component: a text input with a dropdown of suggestions, selected items rendered as removable chip badges, and the ability to create new genres by typing free text.

#### Scenario: Load genre suggestions on mount

- **WHEN** the `GenreSelector` component mounts
- **THEN** it fetches `GET /api/genres` and stores the response as the suggestion list

#### Scenario: Autocomplete dropdown appears on typing

- **WHEN** the user types "sci" in the genre input
- **THEN** a dropdown appears showing genres containing "sci" (e.g., "science-fiction"), filtered case-insensitively

#### Scenario: Select genre from dropdown

- **WHEN** the user clicks a suggestion in the dropdown
- **THEN** the genre is added to the selected list as a chip badge
- **AND** the input is cleared
- **AND** the dropdown closes

#### Scenario: Add new genre not in curated list

- **WHEN** the user types "magical-realism" (not in the suggestion list) and presses Enter or clicks "Create"
- **THEN** the genre "magical-realism" is added to the selected list as a chip badge

#### Scenario: Remove selected genre

- **WHEN** the user clicks the × button on a genre chip badge
- **THEN** the genre is removed from the selected list

#### Scenario: Prevent duplicate genres

- **WHEN** the user selects or creates a genre that is already in the selected list
- **THEN** it is not added a second time

#### Scenario: Dropdown closes on click outside

- **WHEN** the user clicks outside the GenreSelector component
- **THEN** the autocomplete dropdown closes

#### Scenario: Dropdown opens on focus

- **WHEN** the user focuses the genre input by clicking or tabbing into it
- **THEN** the dropdown opens showing all available genres

### Requirement: GenreSelector integration in EditWorkModal

The `EditWorkModal` component SHALL use `GenreSelector` instead of a comma-separated text input for the genres field. The component SHALL receive the work's current genres as initial selected items and propagate changes via the parent component's state.

#### Scenario: EditWorkModal renders GenreSelector

- **WHEN** the EditWorkModal opens for a work with genres `["fiction", "science-fiction"]`
- **THEN** the GenreSelector shows chip badges for "fiction" and "science-fiction"
- **AND** the comma-separated text input is no longer present

#### Scenario: Genres included in form submission

- **WHEN** the user adds "fantasy" and removes "fiction", then saves
- **THEN** the PATCH request body includes `genres: ["science-fiction", "fantasy"]`

### Requirement: AddBook page passes genres from lookup to quick-add

The `AddBook` page SHALL include genres from the ISBN lookup response in the quick-add request body. When the user confirms the preview and submits, the genres field from the lookup data SHALL be sent to `POST /api/quick-add`.

#### Scenario: Genres in quick-add request

- **WHEN** the user scans an ISBN that returns genres `["Science Fiction", "Adventure"]` and confirms the preview
- **THEN** the `POST /api/quick-add` request body includes `genres: ["Science Fiction", "Adventure"]`
- **AND** the server normalizes them to `["adventure", "science-fiction"]` before writing

#### Scenario: No genres in lookup data

- **WHEN** the user scans an ISBN that returns no genres and confirms the preview
- **THEN** the `POST /api/quick-add` request body does not include a `genres` field

### Requirement: Settings page genre curation section

The Settings page SHALL include a "Genres" section with a textarea displaying the curated genre list (one per line), fetched from `GET /api/genres`. A "Save Genres" button SHALL send the edited list to `PATCH /api/genres`.

#### Scenario: Genre section loads current curated list

- **WHEN** the Settings page mounts
- **THEN** the genre textarea is populated with the response from `GET /api/genres`, one genre per line

#### Scenario: Save edited genre list

- **WHEN** the user edits the textarea and clicks "Save Genres"
- **THEN** a PATCH request is sent to `/api/genres` with the parsed genre list
- **AND** a success indicator is shown

#### Scenario: Empty genre list is valid

- **WHEN** the user clears the textarea and clicks "Save Genres"
- **THEN** the PATCH request sends an empty array and the curated list is cleared

#### Scenario: Network error on save

- **WHEN** the PATCH request fails
- **THEN** an error message is displayed to the user
