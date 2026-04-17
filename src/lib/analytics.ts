/**
 * FlowPass — Google Analytics Integration
 *
 * Provides a typed wrapper for Google Analytics 4 (gtag.js).
 * Used for tracking user interaction, event creation, zone activity,
 * and page views. Defaults to gracefully failing if no tracking ID is provided.
 *
 * Google Service: Google Analytics
 */

import type { GtagArgs } from '../types';

/** GA4 Measurement ID loaded from environment (falls back to placeholder) */
export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX';

/**
 * Ensures the global `dataLayer` and `gtag` functions exist.
 */
function initGtag(): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag(...args: GtagArgs) {
      window.dataLayer.push(args);
    };
  }
}

/**
 * Tracks a page view event.
 * @param url - The current path/URL of the page
 */
export const trackPageView = (url: string): void => {
  initGtag();
  if (window.gtag) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
};

/**
 * Custom event tracking structure based on GA4 recommendations.
 */
interface AnalyticsEvent {
  /** The GA4 event action name */
  action: string;
  /** Event category for grouping */
  category?: string;
  /** Human-readable label */
  label?: string;
  /** Numeric value associated with the event */
  value?: number;
  /** Additional custom dimensions/metrics */
  [key: string]: string | number | undefined;
}

/**
 * Tracks a custom event in Google Analytics.
 * @param event - The event payload configuration
 */
export const trackEvent = ({ action, category, label, value, ...rest }: AnalyticsEvent): void => {
  initGtag();
  if (window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
      ...rest,
    });
  }
};

/**
 * Type declarations for the global window object to satisfy TypeScript.
 * Augments Window with GA4's dataLayer and gtag function.
 */
declare global {
  interface Window {
    dataLayer: GtagArgs[];
    gtag: (...args: GtagArgs) => void;
  }
}
