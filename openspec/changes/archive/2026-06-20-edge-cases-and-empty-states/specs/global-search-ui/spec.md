## ADDED Requirements

### Requirement: Search error state displayed
When the search API request fails, the dropdown SHALL display an error message with a retry action instead of silently swallowing the error.

#### Scenario: Search API failure shows error
- **WHEN** a search request to `/api/search` fails (network error or server error)
- **THEN** the dropdown displays "Search failed" with a "Retry" button

#### Scenario: Retry re-executes search
- **WHEN** the user clicks "Retry" after a search failure
- **THEN** the search is re-executed with the current query value
