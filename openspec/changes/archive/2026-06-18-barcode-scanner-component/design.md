## Context

The app currently has an ISBN lookup service (`openspec/specs/isbn-lookup/`) that fetches book metadata given an ISBN string, but no way to obtain that ISBN from a physical barcode. The next step in the quick-add flow is scanning ISBNs directly from a book's barcode using the device camera. This is a purely client-side capability — no backend changes are needed.

The component must be reusable so it can be embedded in the quick-add flow, a standalone "scan" page, or anywhere else an ISBN is needed.

## Goals / Non-Goals

**Goals:**
- Build a single reusable `<BarcodeScanner>` React component that wraps a barcode scanning library.
- Support EAN-13 and UPC-A formats (the two barcode formats used on books).
- Work on mobile (rear camera) and desktop (webcam).
- Provide visual, audible, and haptic feedback on successful scan.
- Handle camera permission lifecycle: request, denied, unavailable.
- Graceful fallback to manual ISBN text input when camera is not available.
- Return the scanned ISBN to the parent component via an `onScan` callback.

**Non-Goals:**
- QR code scanning or non-ISBN barcode formats.
- Continuous scanning mode (scan once, then close).
- Barcode scanning without the `html5-qrcode` library (no native platform APIs).
- Integration with the quick-add flow — that's a separate capability.

## Decisions

### Library Choice: `html5-qrcode`

**Chosen: `html5-qrcode`** over `zxing-js/library` and `quagga2`.

- `html5-qrcode` is actively maintained, has a simple API, works across modern browsers (Chrome, Firefox, Safari, Edge), and supports both 1D (EAN-13, UPC-A) and 2D barcodes via the same interface.
- `zxing-js/library` is powerful but has a more complex API and heavier bundle. It's better suited for offline decoding of image data rather than live camera streams.
- `quagga2` is under-maintained and has known issues with Web Workers in modern bundlers (Vite).

### Component Interface

```tsx
interface BarcodeScannerProps {
  onScan: (isbn: string) => void;
  onCancel?: () => void;
}
```

The component is a controlled render — it takes over the viewport when mounted, scans, and calls `onScan` with the detected ISBN. The parent component manages whether to show or hide the scanner.

### Camera View: Inline Overlay

The scanner renders as a full-viewport overlay with:
- A centered viewfinder region (visual guide for the user to align the barcode).
- A close/cancel button in the top corner.
- Status text below the viewfinder ("Position barcode in frame", "Camera access denied", etc.).

### Feedback on Scan

Three simultaneous feedback channels on detection:
1. **Visual**: Brief green flash on the viewfinder border.
2. **Audible**: A short beep using the Web Audio API (generates a tone, no audio file needed).
3. **Haptic**: `navigator.vibrate(200)` where supported (mobile browsers).

### Camera Permission Handling

The component uses a three-state model:
1. **Requesting**: Initial state. The library requests camera access. Show a loading spinner.
2. **Granted**: Camera is active. Show the viewfinder.
3. **Denied / Error**: Fall back to the manual ISBN input form within the same component.

The manual fallback renders a text input with an "Enter ISBN" label and a submit button. This ensures the parent always receives an ISBN from the `onScan` callback, regardless of camera availability.

### ISBN Extraction

`html5-qrcode` returns the raw barcode string. Book ISBNs in EAN-13 format include a "Bookland" prefix (978 or 979). The component returns the raw barcode string to the parent — ISBN validation and prefix stripping happen at the lookup layer, not in the scanner.

## Risks / Trade-offs

- **Browser camera API inconsistencies**: Some browsers (especially mobile Safari) require HTTPS for `getUserMedia`. Local dev with `localhost` is exempt, but production deployment must use HTTPS. → Mitigation: Document this requirement; the manual ISBN fallback always works without HTTPS.
- **Library bundle size**: `html5-qrcode` is ~200KB minified. → Mitigation: Lazy-load the component with `React.lazy()` so the scanner code is only downloaded when the user opens it.
- **Camera not returning EAN-13 reliably**: Some device cameras (especially low-end webcams) struggle with 1D barcodes. → Mitigation: The manual ISBN fallback is always available; the viewfinder helps the user hold the barcode steady.
- **Multiple rapid scans**: The scanner should stop after the first successful scan. → Mitigation: Call `html5Qrcode.stop()` immediately when a barcode is detected, before calling `onScan`.
