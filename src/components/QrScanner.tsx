import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
}

export default function QrScanner({ onScan, onError }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isStarted, setIsStarted] = useState(false);
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);

  // Keep refs in sync so the scanner callback always uses the latest
  useEffect(() => {
    onScanRef.current = onScan;
    onErrorRef.current = onError;
  }, [onScan, onError]);

  useEffect(() => {
    const containerId = 'flowpass-qr-reader';
    let mounted = true;

    const startScanner = async () => {
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
            if (mounted) {
              onScanRef.current(decodedText);
            }
          },
          () => {
            // QR code not found in this frame — this is normal, ignore
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
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {
          // Scanner may already be stopped
        });
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-full relative">
      <div
        id="flowpass-qr-reader"
        ref={containerRef}
        className="w-full h-full"
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
