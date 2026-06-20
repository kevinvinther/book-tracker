# error-boundary Specification

## Purpose
React error boundary that catches render failures and displays a recovery UI with the navigation chrome still visible.

## Requirements
### Requirement: React error boundary catches render failures
The application SHALL include a React error boundary component that wraps the main route content, catching unhandled exceptions thrown during rendering.

#### Scenario: Render error caught gracefully
- **WHEN** a component throws an unhandled error during rendering
- **THEN** the error boundary catches the error and displays a recovery message instead of a white screen

#### Scenario: Recovery message includes reload action
- **WHEN** the error boundary displays after catching an error
- **THEN** the page shows the message "Something went wrong" with a "Reload page" button that calls `window.location.reload()`

#### Scenario: Header and navigation remain visible
- **WHEN** the error boundary catches an error in a route component
- **THEN** the app header, navigation, and theme remain visible and functional

#### Scenario: Error logged to console
- **WHEN** the error boundary catches an error
- **THEN** the error details are logged to the browser console via `console.error`
