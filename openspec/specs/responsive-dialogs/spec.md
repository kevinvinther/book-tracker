---
id: responsive-dialogs
title: responsive-dialogs
overview: "Shared dialog wrapper that renders as a centered popup on desktop and a bottom-anchored sheet on mobile."
requirementCount: 2
---

# responsive-dialogs Specification

## Purpose
Provides a shared responsive dialog wrapper component used by all modals in the application, rendering as a centered popup on viewports >= 768px and as a full-width bottom-anchored sheet on viewports < 768px.

## Requirements

### Requirement: Responsive dialog positioning
The system SHALL provide a shared dialog wrapper component that renders modal content as a centered popup on viewports 768px and above, and as a full-width bottom-anchored sheet on viewports below 768px.

#### Scenario: Desktop dialog is centered
- **WHEN** the viewport width is 768px or above and a dialog is opened
- **THEN** the dialog appears as a centered popup in the middle of the screen with rounded corners on all sides

#### Scenario: Mobile dialog is bottom-anchored
- **WHEN** the viewport width is below 768px and a dialog is opened
- **THEN** the dialog anchors to the bottom edge of the screen, spans the full viewport width, has rounded top corners, and occupies at most 90% of the viewport height

#### Scenario: Backdrop and close behavior
- **WHEN** a dialog is open and the user taps the backdrop area outside the dialog
- **THEN** the dialog closes, consistent with existing dialog behavior

### Requirement: All existing modals use the shared wrapper
Every modal dialog in the application (edit forms, confirmation dialogs, the note editor, the finish modal) SHALL use the shared responsive dialog wrapper instead of inline positioning classes.

#### Scenario: Edit Work modal uses responsive wrapper
- **WHEN** the user opens the Edit Work modal on a mobile viewport
- **THEN** the form appears as a bottom-anchored sheet matching the responsive dialog behavior

#### Scenario: Confirm dialog uses responsive wrapper
- **WHEN** a confirmation dialog (e.g., delete confirmation) is shown on a mobile viewport
- **THEN** the confirmation appears as a bottom-anchored sheet
