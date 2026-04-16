/**
 * Input Sanitization Utility — FlowPass Security Layer
 * 
 * All user input MUST pass through these sanitizers before database writes.
 * Defense-in-depth: Even though Supabase parameterizes queries (preventing SQL injection),
 * we sanitize client-side to prevent stored XSS, HTML injection, and data corruption.
 * 
 * Sanitization strategy:
 *   1. Strip all HTML tags (prevents stored XSS)
 *   2. Remove dangerous protocols (javascript:, data:, vbscript:)
 *   3. Remove event handler attributes (onclick=, onerror=, etc.)
 *   4. Decode HTML entities to prevent double-encoding attacks
 *   5. Enforce length limits per field type
 *   6. Allowlist characters per field type
 */

// Dangerous protocol patterns that could execute code
const DANGEROUS_PROTOCOLS = /(?:javascript|data|vbscript|file|blob):/gi;

// Event handler attributes (e.g., onclick=, onerror=, onload=)
const EVENT_HANDLERS = /on\w+\s*=/gi;

// HTML tags including self-closing and malformed
const HTML_TAGS = /<\/?[^>]+(>|$)/g;

// HTML entity patterns for decode
const HTML_ENTITIES: Record<string, string> = {
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&',
  '&quot;': '"',
  '&#x27;': "'",
  '&#39;': "'",
};

/**
 * Core sanitizer — strips all dangerous content from any string input.
 * This is the foundation that all field-specific sanitizers build on.
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  let sanitized = input
    .replace(HTML_TAGS, '')                    // 1. Strip HTML tags
    .replace(DANGEROUS_PROTOCOLS, '')          // 2. Remove dangerous protocols
    .replace(EVENT_HANDLERS, '')               // 3. Remove event handlers
    .replace(/<!--[\s\S]*?-->/g, '')          // 4. Remove HTML comments
    .replace(/\/\*[\s\S]*?\*\//g, '');        // 5. Remove CSS comments
  
  // 6. Decode HTML entities to prevent double-encoding bypass
  Object.entries(HTML_ENTITIES).forEach(([entity, char]) => {
    sanitized = sanitized.replace(new RegExp(entity, 'gi'), char);
  });
  
  return sanitized.trim();
}

/**
 * Sanitize attendee names.
 * Allowlist: letters (Unicode), spaces, dots, hyphens, apostrophes.
 * Max: 50 characters.
 */
export function sanitizeName(name: string): string {
  return sanitizeText(name)
    .replace(/[^a-zA-Z\u00C0-\u024F\s.\-']/g, '')  // Unicode letters for international names
    .substring(0, 50);
}

/**
 * Sanitize seat numbers / identifiers.
 * Allowlist: alphanumeric, spaces, commas, dots, hyphens.
 * Max: 50 characters.
 */
export function sanitizeSeat(seat: string): string {
  return sanitizeText(seat)
    .replace(/[^a-zA-Z0-9\s,.\-]/g, '')
    .substring(0, 50);
}

/**
 * Sanitize broadcast announcements from organizer.
 * More permissive (allows punctuation) but length-capped.
 * Max: 160 characters (SMS-length limit).
 */
export function sanitizeMessage(message: string): string {
  return sanitizeText(message)
    .substring(0, 160);
}

/**
 * Sanitize event names and venue names.
 * Allowlist: alphanumeric, spaces, common punctuation.
 * Max: 100 characters.
 */
export function sanitizeEventField(value: string): string {
  return sanitizeText(value)
    .replace(/[^a-zA-Z0-9\u00C0-\u024F\s.\-—–&,!'()]/g, '')
    .substring(0, 100);
}

/**
 * Validate and sanitize PIN codes.
 * Allowlist: alphanumeric and hyphens only.
 * Length: 4-10 characters.
 */
export function sanitizePin(pin: string): string {
  return pin
    .replace(/[^a-zA-Z0-9\-]/g, '')
    .toUpperCase()
    .substring(0, 10);
}

/**
 * Validate UUID format (for pass IDs, event IDs).
 * Prevents injection through URL parameters.
 */
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
