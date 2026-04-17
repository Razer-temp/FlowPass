/**
 * FlowPass — Supabase Client Singleton
 *
 * Initialises the Supabase JS client with the project URL and
 * anonymous key. Values are read from Vite environment variables
 * with hardcoded fallbacks for production resilience.
 *
 * Realtime is configured with a capped event rate to prevent
 * WebSocket flooding during high-traffic events.
 */

import { createClient } from '@supabase/supabase-js';

/** Maximum Supabase realtime events processed per second */
const REALTIME_EVENTS_PER_SECOND = 10;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zzijopwzyedklahwvnqz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWpvcHd6eWVka2xhaHd2bnF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMDI0NDAsImV4cCI6MjA5MTU3ODQ0MH0.4B-21lZsQ3V1IOne-42N7wfPreJ1-P3L8eSuK9BJEQw';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('[FlowPass] Using production fallback credentials — environment variables missing from build.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: REALTIME_EVENTS_PER_SECOND,
    },
  },
});
