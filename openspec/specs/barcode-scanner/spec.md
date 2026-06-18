# barcode-scanner Specification

## Purpose
TBD - created by syncing change barcode-scanner-component. Update Purpose after archive.
## Requirements
### Requirement: Barcode Scanner Component

The system SHALL provide a reusable `<BarcodeScanner>` React component that opens the device camera (or webcam on desktop), detects ISBN barcodes in EAN-13 and UPC-A formats, and returns the scanned ISBN to the parent component via an `onScan` callback.

#### Scenario: Successful scan on mobile

- **WHEN** the user activates the barcode scanner on a mobile device with a rear camera
- **AND** the user positions an EAN-13 ISBN barcode within the viewfinder
- **THEN** the system detects the barcode, plays an audible beep and vibrates the device
- **AND** the system closes the camera and calls `onScan` with the detected ISBN string

#### Scenario: Successful scan on desktop with webcam

- **WHEN** the user activates the barcode scanner on a desktop with a webcam
- **AND** the user positions an UPC-A barcode within the viewfinder
- **THEN** the system detects the barcode and plays an audible beep
- **AND** the system closes the camera and calls `onScan` with the detected barcode string

#### Scenario: User cancels scanning

- **WHEN** the user activates the barcode scanner
- **AND** the user taps the cancel/close button before a barcode is detected
- **THEN** the system stops the camera and calls `onCancel` if provided
- **AND** `onScan` is not called

### Requirement: Camera Permission Handling

The system SHALL request camera permission when the barcode scanner is activated and SHALL degrade gracefully when permission is denied or no camera is available.

#### Scenario: Camera permission granted on first use

- **WHEN** the user activates the barcode scanner for the first time
- **AND** the browser prompts for camera permission
- **AND** the user grants permission
- **THEN** the system activates the camera and displays the viewfinder overlay

#### Scenario: Camera permission denied

- **WHEN** the user activates the barcode scanner
- **AND** camera permission is denied or the user dismisses the permission prompt
- **THEN** the system does not display the viewfinder
- **AND** the system renders a manual ISBN text input field with a submit button
- **AND** submitting the manual input calls `onScan` with the entered ISBN string

#### Scenario: No camera available on desktop

- **WHEN** the user activates the barcode scanner on a desktop that has no webcam
- **THEN** the system detects no camera is available
- **AND** the system renders the manual ISBN text input field
- **AND** the viewfinder is never shown

### Requirement: Viewfinder Overlay

The system SHALL display a viewfinder overlay when the camera is active to guide the user in positioning the barcode.

#### Scenario: Viewfinder displayed during active scanning

- **WHEN** the camera is active and scanning for barcodes
- **THEN** the system displays a centered viewfinder region (a rectangular guide area)
- **AND** the viewfinder includes a cancel/close button
- **AND** the viewfinder shows instructional text ("Position barcode in frame")

#### Scenario: Loading state during camera initialization

- **WHEN** the barcode scanner is activating the camera
- **AND** the camera stream has not yet started
- **THEN** the system displays a loading indicator within the overlay
- **AND** instructional text is not yet shown

### Requirement: Scan Feedback

The system SHALL provide visual, audible, and haptic feedback upon successful barcode detection.

#### Scenario: Feedback on successful detection

- **WHEN** a barcode is successfully detected by the camera
- **THEN** the system flashes a visual indicator (e.g., green border on the viewfinder)
- **AND** the system plays an audible beep via the Web Audio API
- **AND** on devices that support vibration, the system triggers a short vibration (200ms)

#### Scenario: No haptic feedback on unsupported devices

- **WHEN** a barcode is detected on a device that does not support `navigator.vibrate`
- **THEN** the system still provides visual and audible feedback
- **AND** no error is thrown for the missing haptic capability

### Requirement: Component Interface

The system SHALL expose the barcode scanner as a React component with a defined props interface.

#### Scenario: Parent receives scanned ISBN

- **WHEN** a barcode is detected and the scanner closes
- **THEN** the parent component receives the barcode string through the `onScan` callback
- **AND** the raw barcode string is passed as-is (no prefix stripping or validation in the scanner)

#### Scenario: Parent provides cancel handler

- **WHEN** the parent component passes an `onCancel` prop
- **AND** the user cancels the scan
- **THEN** the system calls `onCancel` after stopping the camera

#### Scenario: Parent does not provide cancel handler

- **WHEN** the parent component does not pass an `onCancel` prop
- **AND** the user cancels the scan
- **THEN** the system stops the camera without calling any callback

### Requirement: Lazy Loading

The system SHALL lazy-load the barcode scanner component to avoid bundling the `html5-qrcode` library in the main application bundle.

#### Scenario: Scanner code loads on demand

- **WHEN** the application is loaded
- **THEN** the barcode scanner component and its `html5-qrcode` dependency are not included in the initial JavaScript bundle
- **AND** the scanner code is loaded only when the user navigates to a page or triggers a UI action that renders the component
