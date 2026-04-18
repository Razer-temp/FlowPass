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

/** Zone lifecycle: WAIT → ACTIVE → CLEARED, with optional HOLD */
export type ZoneStatus = 'WAIT' | 'ACTIVE' | 'HOLD' | 'CLEARED' | 'DONE';

/** Pass lifecycle: LOCKED → WAIT → ACTIVE → USED, with optional PAUSED */
export type PassStatus = 'LOCKED' | 'WAIT' | 'ACTIVE' | 'USED' | 'PAUSED';

/** Gate operational status set by gate staff */
export type GateStatusType = 'CLEAR' | 'BUSY' | 'BLOCKED';

/** Event lifecycle status */
export type EventStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ENDED';

/** Activity log entry type */
export type ActivityType = 'ZONE' | 'PASS' | 'SYSTEM' | 'GATE' | 'REASSIGN' | 'BLOCK' | 'ANNOUNCE';

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

// ─── Announcement Insert Shape ─────────────────────────────────

/** Shape for inserting a new announcement (matches Supabase insert) */
export interface FlowAnnouncementRow {
  id?: string;
  event_id: string;
  message: string;
  target_zone?: string;
  created_at?: string;
}

// ─── Supabase Realtime Helpers ─────────────────────────────────

/**
 * Generic shape for Supabase realtime change payloads.
 * Replaces `as any` casts in subscription handlers.
 */
export interface RealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: Partial<T>;
}

// ─── SuperAdmin HQ Types ───────────────────────────────────────

/** Global gate entry used in SuperAdmin command center */
export interface GlobalGateEntry {
  eventName: string;
  eventId: string;
  gate: string;
  status: string;
}

/** Single data point for the 7-day network load chart */
export interface ChartDataPoint {
  date: string;
  total: number;
  count: number;
}

// ─── Smart Gate Reassignment ───────────────────────────────────

/** Active gate reassignment alert payload */
export interface GateReassignmentAlert {
  blockedGate: string;
  affectedZones: string[];
  newGate: string;
}

// ─── Google Translate Widget (Removed) ───────────────────────────

// ─── Analytics ─────────────────────────────────────────────────

/** A single gtag argument entry — used for the Window augmentation */
export type GtagArgs = [string, ...unknown[]];
