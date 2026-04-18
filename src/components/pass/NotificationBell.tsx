/**
 * FlowPass — NotificationBell Component
 *
 * Prompts attendees to enable push notifications for exit alerts.
 * When enabled, the attendee receives a native OS notification
 * ("🟢 Zone B is NOW OPEN!") even with their phone locked.
 *
 * States:
 *   idle      → Shows "Enable Exit Alerts" prompt
 *   requesting → Spinner while requesting permission
 *   granted   → Success confirmation with animated bell
 *   denied    → Subtle blocked message with instructions
 *   hidden    → Firebase not configured or Push not supported
 *
 * Google Service: Firebase Cloud Messaging (Free — Unlimited)
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, BellRing, BellOff, ShieldCheck, ChevronRight } from 'lucide-react';
import { requestPushPermission, isFirebaseConfigured, isPushSupported } from '../../lib/firebase';

/** Notification opt-in lifecycle state */
type NotifState = 'idle' | 'requesting' | 'granted' | 'denied';

interface NotificationBellProps {
  /** The UUID of the attendee's pass (used to save the FCM token) */
  passId: string;
  /** Optional: compact mode for inline display */
  compact?: boolean;
}

export default function NotificationBell({ passId, compact = false }: NotificationBellProps) {
  const [state, setState] = useState<NotifState>(() => {
    // Check if permission was already granted in this session
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        // Check if we already saved a token for this pass
        const saved = sessionStorage.getItem(`fcm_granted_${passId}`);
        if (saved) return 'granted';
      }
      if (Notification.permission === 'denied') return 'denied';
    }
    return 'idle';
  });

  // ─── Graceful Hide: FCM not available ──────────────────────────
  if (!isFirebaseConfigured || !isPushSupported) return null;

  const handleEnable = useCallback(async () => {
    setState('requesting');
    const token = await requestPushPermission(passId);
    if (token) {
      setState('granted');
      sessionStorage.setItem(`fcm_granted_${passId}`, '1');
    } else {
      // Check if denied vs just failed
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        setState('denied');
      } else {
        setState('idle'); // Failed but not denied — can retry
      }
    }
  }, [passId]);

  // ─── Granted State ─────────────────────────────────────────────
  if (state === 'granted') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center gap-3 ${compact ? 'p-3' : 'p-4'} bg-go/10 border border-go/30 rounded-xl`}
      >
        <div className="w-10 h-10 bg-go/20 rounded-full flex items-center justify-center shrink-0">
          <motion.div
            animate={{ rotate: [0, 15, -15, 10, -10, 0] }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <BellRing className="w-5 h-5 text-go" />
          </motion.div>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-go">Exit Alerts Enabled</p>
          <p className="text-xs text-dim leading-relaxed">
            You'll be notified when your zone opens — even with your phone locked.
          </p>
        </div>
        <ShieldCheck className="w-5 h-5 text-go/60 shrink-0" />
      </motion.div>
    );
  }

  // ─── Denied State ──────────────────────────────────────────────
  if (state === 'denied') {
    return (
      <div className={`flex items-center gap-3 ${compact ? 'p-3' : 'p-4'} bg-white/[0.03] border border-white/10 rounded-xl`}>
        <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center shrink-0">
          <BellOff className="w-5 h-5 text-dim" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-dim">Notifications Blocked</p>
          <p className="text-xs text-dim/70 leading-relaxed">
            To enable, open your browser settings → Site permissions → Allow notifications for this site.
          </p>
        </div>
      </div>
    );
  }

  // ─── Idle / Requesting State ───────────────────────────────────
  return (
    <AnimatePresence>
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        onClick={handleEnable}
        disabled={state === 'requesting'}
        aria-label="Enable push notifications for exit zone alerts"
        className={`w-full flex items-center gap-3 ${compact ? 'p-3' : 'p-4'} bg-surface border border-white/10 rounded-xl hover:border-go/30 hover:bg-go/[0.03] transition-all group disabled:opacity-70 disabled:cursor-wait`}
      >
        {/* Animated Bell Icon */}
        <div className="relative w-10 h-10 bg-go/10 rounded-full flex items-center justify-center shrink-0 group-hover:bg-go/20 transition-colors">
          {state === 'requesting' ? (
            <div className="w-5 h-5 border-2 border-go border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Bell className="w-5 h-5 text-go" />
              {/* Pulsing ring */}
              <span className="absolute inset-0 rounded-full border-2 border-go/30 animate-ping" style={{ animationDuration: '2s' }} />
            </>
          )}
        </div>

        {/* Text */}
        <div className="text-left min-w-0 flex-1">
          <p className="text-sm font-bold text-white group-hover:text-go transition-colors">
            {state === 'requesting' ? 'Enabling...' : '🔔 Enable Exit Alerts'}
          </p>
          <p className="text-xs text-dim leading-relaxed">
            {state === 'requesting'
              ? 'Please allow notifications in the browser prompt'
              : "Get notified when your zone opens — even with your phone locked"}
          </p>
        </div>

        {state !== 'requesting' && (
          <ChevronRight className="w-4 h-4 text-dim group-hover:text-go transition-colors shrink-0" />
        )}
      </motion.button>
    </AnimatePresence>
  );
}
