import { useEffect, useRef } from 'react';

/**
 * useWakeLock — Prevents screen from sleeping during critical views.
 *
 * Used by PassView (attendees need QR visible) and GateStaffView
 * (staff need continuous scanning). Automatically re-acquires the
 * lock when the page becomes visible again after tab switch.
 *
 * @example
 * ```tsx
 * function PassView() {
 *   useWakeLock();
 *   return <div>...</div>;
 * }
 * ```
 */
export default function useWakeLock(): void {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        // Wake Lock request can fail if:
        // - Page is not visible
        // - Battery is too low
        // - Browser doesn't support it
        console.warn('[FlowPass] Wake Lock request failed:', err);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, []);
}
