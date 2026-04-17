/**
 * FlowPass — Google Analytics Integration
 *
 * Provides a typed wrapper for Google Analytics 4 (gtag.js).
 * Used for tracking user interaction, event creation, zone activity,
 * and page views. Defaults to gracefully failing if no tracking ID is provided.
 *
 * Google Service: Google Analytics
 */

// Default placeholder for development if not provided in .env
export const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX';

/**
 * Ensures the global `dataLayer` and `gtag` functions exist.
 */
function initGtag() {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }
}

/**
 * Tracks a page view event.
 * @param url The current path/URL of the page
 */
export const trackPageView = (url: string) => {
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
  action: string;
  category?: string;
  label?: string;
  value?: number;
  [key: string]: any; // Allow custom dimensions/metrics
}

/**
 * Tracks a custom event in Google Analytics.
 * @param event The event payload configuration
 */
export const trackEvent = ({ action, category, label, value, ...rest }: AnalyticsEvent) => {
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
 * Type declarations for the global window object to satisfy TypeScript
 */
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}
