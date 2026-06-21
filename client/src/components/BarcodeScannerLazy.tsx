import { lazy, Suspense } from "react";

// Lazy boundary so html5-qrcode (~200KB) stays out of the initial bundle and
// is only fetched when the scanner is actually rendered.
const BarcodeScanner = lazy(() => import("./BarcodeScanner"));

interface BarcodeScannerLazyProps {
  onScan: (isbn: string) => void;
  onCancel?: () => void;
}

function ScannerFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950 text-stone-100">
      <span className="size-8 animate-spin rounded-full border-2 border-stone-600 border-t-emerald-400" />
      <span className="sr-only">Loading scanner…</span>
    </div>
  );
}

export function BarcodeScannerLazy(props: BarcodeScannerLazyProps) {
  return (
    <Suspense fallback={<ScannerFallback />}>
      <BarcodeScanner {...props} />
    </Suspense>
  );
}
