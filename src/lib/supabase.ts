import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zzijopwzyedklahwvnqz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aWpvcHd6eWVka2xhaHd2bnF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMDI0NDAsImV4cCI6MjA5MTU3ODQ0MH0.4B-21lZsQ3V1IOne-42N7wfPreJ1-P3L8eSuK9BJEQw';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('Using production fallback credentials since environment variables were missing from build.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
