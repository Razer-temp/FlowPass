/**
 * FlowPass — Google Maps Embed Integration
 *
 * Generates embed URLs for the Google Maps Embed API to display
 * interactive venue location maps on pass and registration pages.
 *
 * Google Service: Google Maps Embed API
 * Free tier: Unlimited requests (no charge)
 */

// ─── Configuration ─────────────────────────────────────────────

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const MAPS_EMBED_BASE_URL = 'https://www.google.com/maps/embed/v1/place';

// ─── Types ─────────────────────────────────────────────────────

export interface MapEmbedOptions {
  /** The venue or place name to search for */
  query: string;
  /** Optional zoom level (1-21, default 15) */
  zoom?: number;
}

// ─── Core Functions ────────────────────────────────────────────

/**
 * Generates a Google Maps Embed API URL for a given venue.
 *
 * @param options - Map embed configuration
 * @returns Fully-formed embed URL string, or empty string if no API key
 *
 * @example
 * ```ts
 * const url = getMapEmbedUrl({ query: "Wankhede Stadium, Mumbai" });
 * // → "https://www.google.com/maps/embed/v1/place?key=...&q=Wankhede+Stadium,+Mumbai&zoom=15"
 * ```
 */
export function getMapEmbedUrl(options: MapEmbedOptions): string {
  if (!MAPS_API_KEY) {
    console.warn('[GoogleMaps] No API key configured. Map embeds disabled.');
    return '';
  }

  const { query, zoom = 15 } = options;
  const params = new URLSearchParams({
    key: MAPS_API_KEY,
    q: query,
    zoom: zoom.toString(),
  });

  return `${MAPS_EMBED_BASE_URL}?${params.toString()}`;
}

/**
 * Generates a Google Maps directions URL (opens in new tab).
 * This is a free, no-API-key URL that opens Google Maps with directions.
 *
 * @param destination - The venue or address to navigate to
 * @returns Google Maps directions URL
 */
export function getDirectionsUrl(destination: string): string {
  const encoded = encodeURIComponent(destination);
  return `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
}

/**
 * Checks whether Google Maps Embed is available (API key configured).
 */
export function isMapsAvailable(): boolean {
  return !!MAPS_API_KEY;
}
