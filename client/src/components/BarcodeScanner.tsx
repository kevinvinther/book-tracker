import { useEffect, useRef, useState } from "react";
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
  type CameraDevice,
} from "html5-qrcode";
import { Keyboard, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BarcodeScannerProps {
  onScan: (isbn: string) => void;
  onCancel?: () => void;
}

type ScannerStatus = "initializing" | "scanning" | "manual";

const SCAN_REGION_ID = "barcode-scanner-region";

// EAN-13 and UPC-A are the two formats printed on book barcodes.
const BOOK_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.UPC_A,
];

/** Short confirmation beep using the Web Audio API — no audio asset required. */
function playBeep() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.18);
    oscillator.onended = () => ctx.close();
  } catch {
    // Audio feedback is best-effort; never block a successful scan on it.
  }
}

/** Vibrate where supported; silently no-op otherwise. */
function vibrate() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(200);
    } catch {
      // Some browsers expose `vibrate` but reject calls outside a gesture.
    }
  }
}

export default function BarcodeScanner({ onScan, onCancel }: BarcodeScannerProps) {
  const [status, setStatus] = useState<ScannerStatus>("initializing");
  const [flash, setFlash] = useState(false);
  const [manualIsbn, setManualIsbn] = useState("");

  const scannerRef = useRef<Html5Qrcode | null>(null);
  // Guards against double-firing onScan and against StrictMode's double-invoke.
  const handledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode(SCAN_REGION_ID, {
      formatsToSupport: BOOK_FORMATS,
      // Use the browser's native BarcodeDetector when available (Chrome/Edge/
      // Android). Firefox lacks it and transparently falls back to ZXing.
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      verbose: false,
    });
    scannerRef.current = scanner;

    async function start() {
      try {
        const cameras: CameraDevice[] = await Html5Qrcode.getCameras();
        if (cancelled) return;
        if (!cameras || cameras.length === 0) {
          setStatus("manual");
          return;
        }

        await scanner.start(
          // facingMode "environment" picks the rear camera on mobile and
          // harmlessly falls back to the only camera on desktop. The selector
          // must be a single key; resolution goes through videoConstraints.
          { facingMode: "environment" },
          {
            fps: 10,
            // Request a sharp stream so 1D bars resolve. No qrbox: scan the full
            // frame, since a cropped box tends to clip wide EAN-13 barcodes —
            // the on-screen viewfinder is a visual aiming guide only.
            videoConstraints: {
              facingMode: "environment",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          (decodedText) => handleDetected(decodedText),
          undefined,
        );
        if (cancelled) {
          // Component unmounted while the camera was spinning up.
          scanner.stop().catch(() => undefined);
          return;
        }
        setStatus("scanning");
      } catch (err) {
        // Permission denied, no camera, or insecure context. This is a handled
        // degradation — fall back to manual ISBN entry — but log it so real-world
        // "scanner won't open" reports are diagnosable.
        console.warn("[BarcodeScanner] camera unavailable, using manual entry:", err);
        if (!cancelled) setStatus("manual");
      }
    }

    function handleDetected(decodedText: string) {
      if (handledRef.current) return;
      handledRef.current = true;

      setFlash(true);
      playBeep();
      vibrate();

      scanner
        .stop()
        .catch(() => undefined)
        .finally(() => onScan(decodedText));
    }

    start();

    return () => {
      cancelled = true;
      const active = scannerRef.current;
      scannerRef.current = null;
      if (active?.isScanning) {
        active.stop().catch(() => undefined);
      }
    };
    // onScan is intentionally captured once for the scanner's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleCancel() {
    const active = scannerRef.current;
    if (active?.isScanning) {
      active.stop().catch(() => undefined);
    }
    onCancel?.();
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = manualIsbn.trim();
    if (!value || handledRef.current) return;
    handledRef.current = true;
    onScan(value);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-950 text-stone-100">
      {/* Camera feed mounts inside this region; kept present so the library can attach. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div id={SCAN_REGION_ID} className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
      </div>

      {/* Dark scrim above the feed for legible chrome. */}
      <div className="pointer-events-none absolute inset-0 bg-stone-950/40" />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <span className="text-[0.7rem] font-medium tracking-[0.25em] text-stone-300 uppercase">
          Scan ISBN
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          aria-label="Cancel scanning"
          className="text-stone-100 hover:bg-white/10 hover:text-white"
        >
          <X />
        </Button>
      </div>

      {/* Center stage */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        {status === "manual" ? (
          <ManualEntry
            value={manualIsbn}
            onChange={setManualIsbn}
            onSubmit={handleManualSubmit}
          />
        ) : (
          <>
            {/* Viewfinder guide */}
            <div className="relative aspect-[13/8] w-[min(20rem,82vw)]">
              <div
                className={
                  "absolute inset-0 rounded-lg border-2 transition-colors duration-200 " +
                  (flash
                    ? "border-emerald-400 shadow-[0_0_0_9999px_rgba(12,10,9,0.55),0_0_28px_rgba(52,211,153,0.7)]"
                    : "border-stone-100/70 shadow-[0_0_0_9999px_rgba(12,10,9,0.55)]")
                }
              />
              {/* Corner ticks for an instrument-panel feel */}
              {["top-0 left-0 border-t-2 border-l-2", "top-0 right-0 border-t-2 border-r-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map(
                (pos) => (
                  <span
                    key={pos}
                    className={`absolute size-6 rounded-[3px] ${pos} ${flash ? "border-emerald-400" : "border-stone-100"}`}
                  />
                ),
              )}
              {status === "initializing" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <ScanLine className="size-8 animate-pulse text-stone-200" />
                </div>
              )}
            </div>

            <p className="mt-8 max-w-xs text-center text-sm text-stone-300">
              {status === "initializing"
                ? "Starting camera…"
                : "Position the barcode inside the frame"}
            </p>

            {status === "scanning" && (
              <p className="mt-3 max-w-xs text-center text-[0.7rem] leading-relaxed text-stone-500">
                Low-resolution or fixed-focus cameras (most laptop webcams) may
                struggle to read barcodes. If it won't scan, enter the ISBN by hand.
              </p>
            )}

            <button
              type="button"
              onClick={() => setStatus("manual")}
              className="mt-6 inline-flex items-center gap-2 text-xs font-medium tracking-[0.15em] text-stone-400 uppercase underline-offset-4 transition-colors hover:text-stone-100 hover:underline"
            >
              <Keyboard className="size-3.5" />
              Enter ISBN manually
            </button>
          </>
        )}
      </div>
    </div>
  );
}

interface ManualEntryProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

function ManualEntry({ value, onChange, onSubmit }: ManualEntryProps) {
  return (
    <form onSubmit={onSubmit} className="w-[min(22rem,90vw)]">
      <p className="font-display text-2xl text-stone-50">Enter ISBN</p>
      <p className="mt-1 text-sm text-stone-400">
        Camera unavailable — type the number below the barcode.
      </p>
      <label className="mt-6 block">
        <span className="text-xs font-medium tracking-wide text-stone-400 uppercase">
          ISBN
        </span>
        <input
          autoFocus
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="978…"
          className="mt-2 block w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-base text-stone-100 placeholder:text-stone-600 focus:border-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
        />
      </label>
      <Button
        type="submit"
        size="lg"
        disabled={!value.trim()}
        className="mt-6 w-full bg-emerald-500 text-stone-950 hover:bg-emerald-400"
      >
        Look up book
      </Button>
    </form>
  );
}
