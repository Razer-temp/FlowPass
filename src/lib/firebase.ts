/**
 * FlowPass — Firebase Client SDK Integration
 *
 * Initialises Firebase for Cloud Messaging (FCM) web push
 * notifications. Exports helpers for requesting notification
 * permission and obtaining the device's FCM registration token.
 *
 * Graceful Degradation:
 * - If Firebase env vars are missing → all exports are safe no-ops.
 * - If the browser doesn't support Push API → returns null silently.
 * - If the user denies permission → returns null.
 *
 * Google Service: Firebase Cloud Messaging (Free — Unlimited)
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import { supabase } from './supabase';

// ─── Firebase Configuration ────────────────────────────────────

const FIREBASE_API_KEY = import.meta.env.VITE_FIREBASE_API_KEY || '';
const FIREBASE_PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || '';
const FIREBASE_MESSAGING_SENDER_ID = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '';
const FIREBASE_APP_ID = import.meta.env.VITE_FIREBASE_APP_ID || '';
const FIREBASE_VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

/** Whether Firebase Cloud Messaging is fully configured */
export const isFirebaseConfigured = Boolean(
  FIREBASE_API_KEY &&
  FIREBASE_PROJECT_ID &&
  FIREBASE_MESSAGING_SENDER_ID &&
  FIREBASE_APP_ID &&
  FIREBASE_VAPID_KEY
);

/** Whether the current browser supports the Push API */
export const isPushSupported =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

// ─── Firebase Initialization ───────────────────────────────────

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

if (isFirebaseConfigured && isPushSupported) {
  try {
    app = initializeApp({
      apiKey: FIREBASE_API_KEY,
      projectId: FIREBASE_PROJECT_ID,
      messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
      appId: FIREBASE_APP_ID,
    });
    messaging = getMessaging(app);
    console.log('[FlowPass] Firebase Cloud Messaging initialized.');
  } catch (error) {
    console.warn('[FlowPass] Firebase initialization failed:', error);
  }
}

// ─── Service Worker Registration ───────────────────────────────

/**
 * Registers the Firebase messaging service worker.
 * Must be called before requesting the FCM token.
 */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported) return null;

  try {
    // Pass Firebase config to the service worker via a global variable
    // The SW reads this during initialization
    const swUrl = '/firebase-messaging-sw.js';

    // Check if SW is already registered
    const existingReg = await navigator.serviceWorker.getRegistration(swUrl);
    if (existingReg) return existingReg;

    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: '/',
    });

    console.log('[FlowPass] FCM Service Worker registered:', registration.scope);
    return registration;
  } catch (error) {
    console.warn('[FlowPass] Service Worker registration failed:', error);
    return null;
  }
}

// ─── Public API ────────────────────────────────────────────────

/**
 * Requests notification permission from the browser, obtains the
 * FCM device token, and saves it to the pass record in Supabase.
 *
 * @param passId - The UUID of the attendee's pass
 * @returns The FCM token string, or null if unavailable
 */
export async function requestPushPermission(passId: string): Promise<string | null> {
  if (!isFirebaseConfigured || !isPushSupported || !messaging) {
    console.log('[FlowPass] FCM not available — skipping push registration.');
    return null;
  }

  try {
    // Step 1: Request browser notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[FlowPass] Notification permission denied.');
      return null;
    }

    // Step 2: Register the service worker
    const swRegistration = await registerServiceWorker();
    if (!swRegistration) return null;

    // Step 3: Get the FCM device token
    const token = await getToken(messaging, {
      vapidKey: FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (!token) {
      console.warn('[FlowPass] FCM getToken returned empty.');
      return null;
    }

    console.log('[FlowPass] FCM token obtained:', token.slice(0, 20) + '...');

    // Step 4: Save the token to the pass record in Supabase
    const { error } = await supabase
      .from('passes')
      .update({ fcm_token: token })
      .eq('id', passId);

    if (error) {
      console.error('[FlowPass] Failed to save FCM token to Supabase:', error);
    } else {
      console.log('[FlowPass] FCM token saved to pass record.');
    }

    return token;
  } catch (error) {
    console.error('[FlowPass] Push permission request failed:', error);
    return null;
  }
}

/**
 * Subscribes to foreground FCM messages. When a message arrives
 * while the app is in focus, the callback is invoked so the UI
 * can show an in-app toast instead of a system notification.
 *
 * @param callback - Handler for incoming foreground messages
 * @returns Unsubscribe function, or a no-op if FCM is unavailable
 */
export function onForegroundMessage(
  callback: (payload: { title: string; body: string; zoneId?: string }) => void
): () => void {
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    const data = payload.data || {};
    callback({
      title: data.title || '🟢 FlowPass Alert',
      body: data.body || 'Check your pass for updates.',
      zoneId: data.zoneId,
    });
  });
}
