/**
 * FlowPass — VenueMap Component
 *
 * Renders an interactive Google Maps Embed showing the event venue
 * location. Includes a "Get Directions" link for navigation.
 *
 * Google Service: Google Maps Embed API (Free — Unlimited)
 */

import { MapPin, Navigation, ExternalLink } from 'lucide-react';
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
  if (!isMapsAvailable()) return null;

  const embedUrl = getMapEmbedUrl({ query: venueName, zoom: 15 });
  const directionsUrl = getDirectionsUrl(venueName);

  if (!embedUrl) return null;

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
