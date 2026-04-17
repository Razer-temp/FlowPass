import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
}

export default function QrScanner({ onScan, onError }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const hasScannedRef = useRef(false);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);

  // Keep refs in sync
  useEffect(() => {
    onScanRef.current = onScan;
    onErrorRef.current = onError;
  }, [onScan, onError]);

  useEffect(() => {
    const containerId = 'flowpass-qr-reader';
    let mounted = true;
    let scanner: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode(containerId, { verbose: false });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // CRITICAL: Only fire once per scan session
            if (!mounted || hasScannedRef.current) return;
            hasScannedRef.current = true;

            // Stop scanning immediately to prevent further callbacks
            if (scanner) {
              scanner.pause(true);
            }

            onScanRef.current(decodedText);
          },
          () => {
            // QR code not found in this frame — normal, ignore
          }
        );

        if (mounted) setIsStarted(true);
      } catch (err: any) {
        console.error('QR Scanner start error:', err);
        if (mounted && onErrorRef.current) {
          onErrorRef.current(
            typeof err === 'string' ? err : err?.message || 'Failed to start camera'
          );
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      const s = scannerRef.current;
      scannerRef.current = null;
      
      if (s) {
        const state = s.getState();
        // Only stop if scanner is actively scanning or paused
        if (state === 2 /* SCANNING */ || state === 3 /* PAUSED */) {
          s.stop().then(() => {
            try { s.clear(); } catch (_) { /* ignore */ }
          }).catch(() => {
            try { s.clear(); } catch (_) { /* ignore */ }
          });
        } else {
          try { s.clear(); } catch (_) { /* ignore */ }
        }
      }
    };
  }, []);

  return (
    <div className="w-full h-full relative">
      <div
        id="flowpass-qr-reader"
        className="w-full h-full"
        style={{ minHeight: '300px' }}
      />
      {!isStarted && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-white/70 text-sm">Initializing camera...</p>
          </div>
        </div>
      )}
    </div>
  );
}
