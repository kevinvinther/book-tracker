## 1. Dependency Setup

- [x] 1.1 Install `html5-qrcode` npm package in `client/`
- [x] 1.2 Verify the package compiles with the existing Vite + TypeScript setup

## 2. Core Barcode Scanner Component

- [x] 2.1 Create `client/src/components/BarcodeScanner.tsx` with the component props interface (`onScan: (isbn: string) => void`, `onCancel?: () => void`)
- [x] 2.2 Implement camera initialization using `Html5Qrcode.getCameras()` and `Html5Qrcode.start()` with EAN-13 and UPC-A format configuration
- [x] 2.3 Implement scan detection handler — on successful scan, call `html5Qrcode.stop()`, then invoke `onScan` with the raw barcode string
- [x] 2.4 Implement cleanup in the component's return/teardown — stop any active scanner on unmount to release the camera

## 3. Camera Permission Handling

- [x] 3.1 Handle camera permission denied or unavailable — catch the error from `start()`, detect the failure reason, transition to manual fallback state
- [x] 3.2 Implement manual ISBN fallback form — text input with "Enter ISBN" label and submit button, calling `onScan` with the entered string on submit
- [x] 3.3 Implement loading/initializing state while camera is starting up

## 4. Viewfinder Overlay UI

- [x] 4.1 Build the full-viewport overlay layout with dark semi-transparent background
- [x] 4.2 Build the centered viewfinder guide region (rectangular cutout with border)
- [x] 4.3 Add close/cancel button in the top corner that stops scanning and calls `onCancel`
- [x] 4.4 Add instructional status text below the viewfinder that updates based on state (loading, scanning, denied)

## 5. Scan Feedback

- [x] 5.1 Implement visual feedback — brief green flash animation on the viewfinder border when a barcode is detected
- [x] 5.2 Implement audible feedback — generate a short beep tone using the Web Audio API (no external audio file)
- [x] 5.3 Implement haptic feedback — call `navigator.vibrate(200)` when supported, with a safe fallback on unsupported devices

## 6. Lazy Loading

- [x] 6.1 Wrap the BarcodeScanner component with `React.lazy()` in a separate barrel export (e.g., `client/src/components/BarcodeScannerLazy.tsx` or inline in the consumer)
- [x] 6.2 Add a Suspense fallback (loading spinner or skeleton) for when the scanner chunk is being downloaded

## 7. Verification

- [x] 7.1 Verify the component mounts and requests camera permission in a browser
- [x] 7.2 Verify cancel button stops scanning and unmounts cleanly (camera indicator light turns off)
- [x] 7.3 Verify manual ISBN fallback renders when camera is denied or unavailable
- [x] 7.4 Run `npm run typecheck` and `npm run lint` in `client/` with zero errors
