## Why

The app needs a way to scan ISBN barcodes from a device camera or webcam as the primary input for the quick-add flow. Without this component, users must manually type ISBNs, which is error-prone and slow — especially on mobile where barcode scanning is the fastest path to adding a book.

## What Changes

- Integrate the `html5-qrcode` library for camera-based barcode scanning in the browser.
- Build a reusable `<BarcodeScanner>` component that opens the device camera or webcam with a viewfinder overlay.
- Handle camera permission requests on first use and degrade gracefully to manual ISBN input when denied or unavailable.
- Provide audible and haptic feedback on successful scan, then immediately capture the ISBN and close the camera.
- Support EAN-13 and UPC-A formats (standard book barcodes).
- Desktop fallback: use webcam if available; show manual ISBN input field if no webcam exists.

## Capabilities

### New Capabilities
- `barcode-scanner`: A reusable React component that opens the device camera/webcam, detects ISBN barcodes (EAN-13, UPC-A), provides scan feedback, and returns the captured ISBN to the parent. Includes graceful degradation (camera permission denied → manual ISBN input; no webcam on desktop → manual ISBN input).

### Modified Capabilities
<!-- No existing capability requirements change — this is a new standalone component. -->

## Impact

- **Dependencies**: New npm package `html5-qrcode` (client-side only, no backend changes).
- **Client code**: New component at `client/src/components/BarcodeScanner.tsx`. Used by the quick-add flow and potentially other ISBN entry points.
- **UX**: Camera permission prompt on first scan. Fallback to manual ISBN input when camera is unavailable.
