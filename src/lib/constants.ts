/**
 * FlowPass — Application Constants
 *
 * Centralizes all magic numbers, timeouts, and configuration values
 * used across the application. Importing from here ensures consistency
 * and makes tuning easy without hunting through component files.
 */

// ─── Polling & Timing ──────────────────────────────────────────

/** Interval (ms) for fallback data polling when WebSocket drops */
export const REALTIME_POLL_INTERVAL_MS = 5000;

/** Interval (ms) between AI Advisor analysis refreshes */
export const AI_ANALYSIS_INTERVAL_MS = 30_000;

/** Duration (ms) a "copied" tooltip stays visible */
export const COPY_FEEDBACK_DURATION_MS = 2000;

/** Cooldown (ms) between attendee form submissions (rate limiting) */
export const SUBMISSION_RATE_LIMIT_MS = 5000;

/** Duration (ms) for gate-staff flash overlay animation */
export const FLASH_DURATION_MS = 500;

/** Delay (ms) before processing scanned QR result */
export const QR_PROCESS_DELAY_MS = 500;

// ─── UI Constants ──────────────────────────────────────────────

/** Maximum character length for broadcast announcements */
export const ANNOUNCEMENT_MAX_LENGTH = 160;

/** Maximum character length for attendee names */
export const NAME_MAX_LENGTH = 50;

/** Maximum character length for event/venue names */
export const EVENT_FIELD_MAX_LENGTH = 100;

/** Maximum character length for a security PIN */
export const PIN_MAX_LENGTH = 10;

/** Minimum character length for a security PIN */
export const PIN_MIN_LENGTH = 4;

/** Number of recent announcements to display */
export const RECENT_ANNOUNCEMENTS_LIMIT = 5;

/** Number of recent activity log entries to display */
export const ACTIVITY_LOG_LIMIT = 10;

/** Recent passes to show in SuperAdmin HQ */
export const RECENT_PASSES_LIMIT = 100;

// ─── Zone Algorithm ────────────────────────────────────────────

/** Minutes before a zone exit when its countdown becomes visible */
export const COUNTDOWN_VISIBILITY_MINUTES = 15;

/** Countdown visibility threshold in milliseconds */
export const COUNTDOWN_VISIBILITY_MS = COUNTDOWN_VISIBILITY_MINUTES * 60_000;

// ─── QR Scanner States (from html5-qrcode library) ─────────────

/** html5-qrcode internal state: scanner is actively scanning */
export const QR_STATE_SCANNING = 2;

/** html5-qrcode internal state: scanner is paused */
export const QR_STATE_PAUSED = 3;

// ─── Hero Animation ────────────────────────────────────────────

/** Interval (ms) for the hero pass-state toggle animation */
export const HERO_CYCLE_INTERVAL_MS = 4000;

// ─── SuperAdmin ────────────────────────────────────────────────

/** Master authentication key for the Super Admin HQ */
export const SUPER_ADMIN_MASTER_KEY = 'FLOW-NEXUS-99';

/** Maximum failed login attempts before redirect */
export const MAX_LOGIN_ATTEMPTS = 3;

/** Number of days shown in the network load chart */
export const CHART_DAYS = 7;

// ─── Firebase Cloud Messaging ──────────────────────────────────

/** Default title for zone-unlock push notifications */
export const FCM_ZONE_UNLOCK_TITLE = '🟢 EXIT NOW — FlowPass';

/** Maximum FCM tokens per multicast batch (FCM limit is 500) */
export const FCM_MULTICAST_BATCH_SIZE = 500;

/** Timeout (ms) for the /api/notify-zone server call */
export const FCM_NOTIFY_TIMEOUT_MS = 10_000;
