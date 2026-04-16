/**
 * FlowPass — Shared Type Definitions
 *
 * Centralized interfaces for all database entities and application state.
 * Every component imports from here instead of using `any`.
 *
 * These types mirror the Supabase table schemas exactly, ensuring
 * type safety from database → API → component → render.
 */

// ─── Status Enums ──────────────────────────────────────────────

/** Zone lifecycle: WAIT → ACTIVE → DONE */
export type ZoneStatus = 'WAIT' | 'ACTIVE' | 'DONE';

/** Pass lifecycle: WAIT → ACTIVE → USED */
export type PassStatus = 'WAIT' | 'ACTIVE' | 'USED';

/** Gate operational status set by gate staff */
export type GateStatusType = 'CLEAR' | 'BLOCKED';

/** Event lifecycle status */
export type EventStatus = 'ACTIVE' | 'PAUSED' | 'ENDED';

/** Activity log entry type */
export type ActivityType = 'ZONE' | 'PASS' | 'SYSTEM' | 'GATE';

// ─── Database Entities ─────────────────────────────────────────

/** Supabase `events` table row */
export interface FlowEvent {
  id: string;
  name: string;
  venue: string;
  date: string;
  end_time: string;
  crowd: number;
  gates: string[];
  pin: string;
  gate_status: Record<string, string>;
  status?: EventStatus;
  created_at?: string;
}

/** Supabase `zones` table row */
export interface FlowZone {
  id: string;
  event_id: string;
  name: string;
  status: ZoneStatus;
  exit_time: string;
  gates: string[];
  estimated_people: number;
}

/** Supabase `passes` table row */
export interface FlowPass {
  id: string;
  event_id: string;
  attendee_name: string;
  seat_number: string;
  zone_id: string;
  gate_id: string;
  status: PassStatus;
  exited_at?: string | null;
  created_at?: string;
}

/** Supabase `announcements` table row */
export interface FlowAnnouncement {
  id: string;
  event_id: string;
  message: string;
  created_at: string;
}

/** Supabase `activity_log` table row */
export interface FlowActivityLog {
  id: string;
  event_id: string;
  action: string;
  type: ActivityType;
  created_at: string;
}

// ─── Derived / UI Types ────────────────────────────────────────

/** Gate status as displayed in the UI (constructed from event.gates + event.gate_status) */
export interface GateDisplay {
  name: string;
  status: GateStatusType | string;
  peopleThrough?: number;
}

/** Validation result from gate staff pass scanning */
export interface ValidationResult {
  type: 'VALID' | 'USED' | 'WRONG_GATE' | 'NOT_OPEN' | 'NOT_FOUND' | 'OFFLINE_VALID' | 'OFFLINE_UNKNOWN';
  pass?: FlowPass;
  zone?: FlowZone;
}

/** Gate staff shift statistics */
export interface ShiftStats {
  checked: number;
  valid: number;
  invalid: number;
  overrides: number;
  reports: number;
  lastReport: string;
}
