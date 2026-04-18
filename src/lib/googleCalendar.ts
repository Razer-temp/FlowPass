/**
 * FlowPass — Google Calendar Deep-Link Integration
 *
 * Generates Google Calendar event creation URLs using the public
 * deep-link scheme. No API key, no quota, completely free.
 *
 * Google Service: Google Calendar (Deep-link / URL scheme)
 * Free tier: Unlimited (no API calls — client-side URL generation)
 */

// ─── Types ─────────────────────────────────────────────────────

export interface CalendarEventParams {
  /** Event title */
  title: string;
  /** Event date in YYYY-MM-DD format */
  date: string;
  /** Event end time in HH:MM 24-hour format */
  endTime: string;
  /** Venue or location name */
  location: string;
  /** Description or details to include */
  description?: string;
}

// ─── Constants ─────────────────────────────────────────────────

const CALENDAR_BASE_URL = 'https://calendar.google.com/calendar/render';

/** Default event duration in hours when only end time is known */
const DEFAULT_EVENT_DURATION_HOURS = 4;

// ─── Core Functions ────────────────────────────────────────────

/**
 * Converts a date string and time to Google Calendar's required
 * `YYYYMMDDTHHmmssZ` format.
 *
 * @param dateStr - Date in YYYY-MM-DD format
 * @param timeStr - Time in HH:MM 24-hour format
 * @returns Formatted date-time string for Google Calendar URL
 */
function formatCalendarDateTime(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split('-');
  const [hours, minutes] = timeStr.split(':');
  return `${year}${month}${day}T${hours}${minutes}00`;
}

/**
 * Calculates the event start time by subtracting the default duration
 * from the event's scheduled end time.
 *
 * @param dateStr - Date in YYYY-MM-DD format
 * @param endTimeStr - End time in HH:MM format
 * @returns Start time in HH:MM format
 */
function calculateStartTime(dateStr: string, endTimeStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = endTimeStr.split(':').map(Number);

  const endDate = new Date(year, month - 1, day, hours, minutes);
  const startDate = new Date(endDate.getTime() - DEFAULT_EVENT_DURATION_HOURS * 60 * 60 * 1000);

  const startHours = startDate.getHours().toString().padStart(2, '0');
  const startMinutes = startDate.getMinutes().toString().padStart(2, '0');

  return `${startHours}:${startMinutes}`;
}

/**
 * Generates a Google Calendar deep-link URL for adding an event.
 *
 * @param params - Event details to pre-fill in the calendar
 * @returns Fully-formed Google Calendar URL that opens the "New Event" dialog
 *
 * @example
 * ```ts
 * const url = getCalendarUrl({
 *   title: "IPL 2026 — MI vs CSK",
 *   date: "2026-04-20",
 *   endTime: "22:00",
 *   location: "Wankhede Stadium, Mumbai",
 *   description: "Your FlowPass is ready at: https://flowpass.app/pass/abc123"
 * });
 * ```
 */
export function getCalendarUrl(params: CalendarEventParams): string {
  const { title, date, endTime, location, description } = params;

  const startTime = calculateStartTime(date, endTime);
  const formattedStart = formatCalendarDateTime(date, startTime);
  const formattedEnd = formatCalendarDateTime(date, endTime);

  const calendarParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formattedStart}/${formattedEnd}`,
    location: location,
    details: description || `🎫 Event managed by FlowPass — Smart Crowd Management`,
  });

  return `${CALENDAR_BASE_URL}?${calendarParams.toString()}`;
}
