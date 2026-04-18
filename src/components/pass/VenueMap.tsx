/**
 * FlowPass — VenueMap Component
 *
 * Renders an interactive Google Maps Embed showing the event venue
 * location. Includes a "Get Directions" link for navigation.
 *
 * Google Service: Google Maps Embed API (Free — Unlimited)
 */

import { MapPin, Navigation, ExternalLink, Map } from 'lucide-react';
import { getMapEmbedUrl, getDirectionsUrl, isMapsAvailable } from '../../lib/googleMaps';

interface VenueMapProps {
  /** Venue name or address to display on the map */
  venueName: string;
}

/** Iframe border radius in pixels for the embedded map */
const MAP_BORDER_RADIUS = 12;

/** Default map height in pixels */
const MAP_HEIGHT = 220;

export default function VenueMap({ venueName }: VenueMapProps) {
  const mapsAvailable = isMapsAvailable();
  const embedUrl = mapsAvailable ? getMapEmbedUrl({ query: venueName, zoom: 15 }) : '';
  const directionsUrl = getDirectionsUrl(venueName);

  // ─── Fallback: No API key configured ──────────────────────────
  if (!mapsAvailable || !embedUrl) {
    return (
      <div className="mt-6 mb-2">
        <div className="bg-surface border border-white/10 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2 text-sm font-bold">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span>Venue Location</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-dim font-mono tracking-wider uppercase">
              <Map className="w-3 h-3" />
              Google Maps
            </div>
          </div>

          {/* Fallback Content */}
          <div className="relative">
            {/* Static map placeholder with gradient background */}
            <div
              className="flex flex-col items-center justify-center text-center px-6"
              style={{ height: MAP_HEIGHT }}
            >
              {/* Decorative grid pattern */}
              <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }} />

              {/* Pulsing pin */}
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                <div className="relative w-12 h-12 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-blue-400" />
                </div>
              </div>

              <p className="text-white font-bold text-sm mb-1 relative z-10">{venueName}</p>
              <p className="text-dim text-xs leading-relaxed max-w-[240px] relative z-10">
                Interactive map preview requires a Google Maps API key
              </p>
            </div>
          </div>

          {/* Actions — Directions link works without any API key */}
          <div className="px-4 py-3 flex items-center justify-between border-t border-white/10">
            <p className="text-xs text-dim truncate max-w-[55%]">{venueName}</p>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 text-xs font-bold rounded-lg hover:bg-blue-500/20 transition-colors"
              aria-label={`Get directions to ${venueName}`}
            >
              <Navigation className="w-3 h-3" />
              Get Directions
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ─── Full: Live Google Maps embed ─────────────────────────────
  return (
    <div className="mt-6 mb-2">
      <div className="bg-surface border border-white/10 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2 text-sm font-bold">
            <MapPin className="w-4 h-4 text-go" />
            <span>Venue Location</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-dim font-mono tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-go animate-pulse" />
            Google Maps
          </div>
        </div>

        {/* Map Embed */}
        <div className="relative">
          <iframe
            src={embedUrl}
            width="100%"
            height={MAP_HEIGHT}
            style={{ border: 0, borderRadius: `0 0 ${MAP_BORDER_RADIUS}px ${MAP_BORDER_RADIUS}px` }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            title={`Map showing ${venueName}`}
            aria-label={`Interactive map of ${venueName}`}
          />

          {/* Gradient overlay at bottom for seamless blend */}
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-surface/80 to-transparent pointer-events-none" />
        </div>

        {/* Actions */}
        <div className="px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-dim truncate max-w-[60%]">{venueName}</p>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-go/10 text-go text-xs font-bold rounded-lg hover:bg-go/20 transition-colors"
            aria-label={`Get directions to ${venueName}`}
          >
            <Navigation className="w-3 h-3" />
            Directions
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
