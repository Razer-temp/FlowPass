/**
 * FlowPass — AddToCalendarButton Component
 *
 * Renders a sleek "Add to Google Calendar" button that opens a
 * pre-filled Google Calendar event creation dialog in a new tab.
 *
 * Google Service: Google Calendar (Deep-link — Free, No API)
 */

import { Calendar, ExternalLink } from 'lucide-react';
import { getCalendarUrl } from '../../lib/googleCalendar';

interface AddToCalendarButtonProps {
  /** Event title to pre-fill */
  eventName: string;
  /** Event date in YYYY-MM-DD format */
  date: string;
  /** Event end time in HH:MM 24-hour format */
  endTime: string;
  /** Venue or location name */
  venue: string;
  /** Direct link to the attendee's pass (included in event description) */
  passUrl?: string;
}

export default function AddToCalendarButton({
  eventName,
  date,
  endTime,
  venue,
  passUrl,
}: AddToCalendarButtonProps) {
  const description = passUrl
    ? `🎫 Your FlowPass: ${passUrl}\n\n📍 Venue: ${venue}\n⏰ Ends at: ${endTime}\n\nManaged by FlowPass — Smart Crowd Management`
    : `📍 Venue: ${venue}\n⏰ Ends at: ${endTime}\n\nManaged by FlowPass — Smart Crowd Management`;

  const calendarUrl = getCalendarUrl({
    title: eventName,
    date,
    endTime,
    location: venue,
    description,
  });

  return (
    <div className="mt-4">
      <a
        href={calendarUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-surface border border-white/10 rounded-xl hover:border-blue-500/40 hover:bg-blue-500/5 transition-all duration-300"
        aria-label={`Add ${eventName} to Google Calendar`}
      >
        {/* Google Calendar Icon */}
        <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center group-hover:bg-blue-500/25 transition-colors">
          <Calendar className="w-4 h-4 text-blue-400" />
        </div>

        <div className="flex-1 text-left">
          <div className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
            Add to Google Calendar
          </div>
          <div className="text-[10px] text-dim font-mono tracking-wider">
            {new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {endTime}
          </div>
        </div>

        <ExternalLink className="w-4 h-4 text-dim group-hover:text-blue-400 transition-colors" />
      </a>
    </div>
  );
}
