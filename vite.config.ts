/**
 * FlowPass — Vite Configuration
 *
 * Configures the Vite development server and build pipeline.
 * Includes Tailwind CSS (via the @tailwindcss/vite plugin) and
 * the React SWC plugin for fast JSX transpilation.
 */

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    // SECURITY: API keys are never injected into the client bundle.
    // Gemini AI calls should be routed through a server-side proxy
    // or Supabase Edge Function to keep the key secret.
    define: {},
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  };
});
