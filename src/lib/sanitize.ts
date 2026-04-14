/**
 * Input sanitization utility
 * Strips HTML tags, script injections, and trims whitespace
 * before inserting user input into Supabase.
 */

export function sanitizeText(input: string): string {
  if (!input) return '';
  return input
    .replace(/<[^>]*>/g, '')           // Strip HTML tags
    .replace(/javascript:/gi, '')       // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '')        // Remove event handlers like onclick=
    .replace(/&lt;/g, '<')             // Decode common HTML entities
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

export function sanitizeName(name: string): string {
  return sanitizeText(name)
    .replace(/[^a-zA-Z\s.\-']/g, '')  // Only allow letters, spaces, dots, hyphens, apostrophes
    .substring(0, 50);                  // Max 50 chars
}

export function sanitizeSeat(seat: string): string {
  return sanitizeText(seat)
    .replace(/[^a-zA-Z0-9\s,.\-]/g, '') // Alpha, numbers, spaces, comma, dot, hyphen
    .substring(0, 50);
}

export function sanitizeMessage(message: string): string {
  return sanitizeText(message)
    .substring(0, 160);                 // Max 160 chars for announcements
}
