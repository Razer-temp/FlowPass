/**
 * FlowPass — QR Code Scanner Component
 *
 * Wraps the html5-qrcode library to provide camera-based QR code
 * scanning for gate staff. Uses the rear camera by default and
 * prevents duplicate scan callbacks via a ref guard.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QR_STATE_SCANNING, QR_STATE_PAUSED } from '../lib/constants';

interface QrScannerProps {
  /** Callback fired when a QR code is successfully decoded */
  onScan: (decodedText: string) => void;
  /** Callback fired when the scanner encounters a camera error */
  onError?: (error: string) => void;
}

export default function QrScanner({ onScan, onError }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const hasScannedRef = useRef(false);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);

  // Keep refs in sync with latest props
  useEffect(() => {
    onScanRef.current = onScan;
    onErrorRef.current = onError;
  }, [onScan, onError]);

  // We need useCallback to satisfy the exhaustive-deps lint rule but the
  // scanner initialisation intentionally runs only once on mount.
  const startScanner = useCallback(async (containerId: string, mounted: { value: boolean }) => {
    try {
      const scanner = new Html5Qrcode(containerId, { verbose: false });
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
          if (!mounted.value || hasScannedRef.current) return;
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

      if (mounted.value) setIsStarted(true);
    } catch (err: unknown) {
      console.error('[QrScanner] Start error:', err);
      if (mounted.value && onErrorRef.current) {
        const message = err instanceof Error ? err.message : String(err);
        onErrorRef.current(message || 'Failed to start camera');
      }
    }
  }, []);

  useEffect(() => {
    const containerId = 'flowpass-qr-reader';
    const mounted = { value: true };

    startScanner(containerId, mounted);

    return () => {
      mounted.value = false;
      const s = scannerRef.current;
      scannerRef.current = null;
      
      if (s) {
        const state = s.getState();
        if (state === QR_STATE_SCANNING || state === QR_STATE_PAUSED) {
          s.stop().then(() => {
            try { s.clear(); } catch { /* ignore */ }
          }).catch(() => {
            try { s.clear(); } catch { /* ignore */ }
          });
        } else {
          try { s.clear(); } catch { /* ignore */ }
        }
      }
    };
  }, [startScanner]);

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
