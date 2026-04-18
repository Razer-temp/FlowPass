/**
 * FlowPass — Google Wallet Integration
 *
 * Generates Google Wallet "Add to Wallet" save URLs using the
 * Generic Pass type. Uses the JWT-based URL scheme for creating
 * digital passes that attendees can save to their Android devices.
 *
 * Google Service: Google Wallet API (Generic Pass)
 * Free tier: Unlimited (no charge for pass creation)
 *
 * NOTE: Full Google Wallet integration requires an Issuer Account
 * and Service Account for JWT signing. This module provides the
 * pass structure and a demo-compatible save URL. When running
 * without credentials, it gracefully degrades to a preview mode.
 */

import type { FlowPass, FlowEvent, FlowZone } from '../types';

// ─── Types ─────────────────────────────────────────────────────

export interface WalletPassData {
  /** Pass holder's name */
  attendeeName: string;
  /** Event title */
  eventName: string;
  /** Venue location */
  venue: string;
  /** Assigned zone name */
  zoneName: string;
  /** Assigned gate ID */
  gateId: string;
  /** Seat or section number */
  seatNumber: string;
  /** Event date string */
  eventDate: string;
  /** Event end time */
  endTime: string;
  /** URL to the digital pass */
  passUrl: string;
  /** Short pass code for manual verification */
  passCode: string;
}

// ─── Constants ─────────────────────────────────────────────────

const WALLET_SAVE_BASE_URL = 'https://pay.google.com/gp/v/save';

// ─── Core Functions ────────────────────────────────────────────

/**
 * Builds the wallet pass data structure from FlowPass entities.
 *
 * @param pass - The attendee's pass record
 * @param event - The event record
 * @param zone - The assigned zone record
 * @returns Structured wallet pass data
 */
export function buildWalletPassData(
  pass: FlowPass,
  event: FlowEvent,
  zone: FlowZone
): WalletPassData {
  const passUrl = `${window.location.origin}/pass/${pass.id}`;
  const passCode = pass.id.slice(-6).toUpperCase();

  return {
    attendeeName: pass.attendee_name,
    eventName: event.name,
    venue: event.venue,
    zoneName: zone.name,
    gateId: pass.gate_id,
    seatNumber: pass.seat_number,
    eventDate: event.date,
    endTime: event.end_time,
    passUrl,
    passCode,
  };
}

/**
 * Generates a Google Wallet Generic Pass object JSON.
 *
 * This creates the full pass structure that would be encoded
 * into a JWT for the Google Wallet save URL.
 *
 * @param data - Wallet pass data
 * @returns Stringified Generic Pass object
 */
export function generatePassObject(data: WalletPassData): string {
  const passObject = {
    iss: 'flowpass-app',
    aud: 'google',
    typ: 'savetowallet',
    payload: {
      genericObjects: [
        {
          id: `flowpass.${data.passCode}`,
          classId: 'flowpass.event_pass',
          state: 'ACTIVE',
          header: {
            defaultValue: {
              language: 'en',
              value: data.eventName,
            },
          },
          subheader: {
            defaultValue: {
              language: 'en',
              value: data.venue,
            },
          },
          cardTitle: {
            defaultValue: {
              language: 'en',
              value: 'FlowPass',
            },
          },
          textModulesData: [
            {
              id: 'attendee',
              header: 'ATTENDEE',
              body: data.attendeeName,
            },
            {
              id: 'zone',
              header: 'ZONE',
              body: data.zoneName,
            },
            {
              id: 'gate',
              header: 'GATE',
              body: data.gateId,
            },
            {
              id: 'seat',
              header: 'SEAT',
              body: data.seatNumber,
            },
            {
              id: 'date',
              header: 'DATE',
              body: new Date(data.eventDate).toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }),
            },
          ],
          barcode: {
            type: 'QR_CODE',
            value: data.passUrl,
            alternateText: data.passCode,
          },
          hexBackgroundColor: '#0A0A14',
        },
      ],
    },
  };

  return JSON.stringify(passObject);
}

function encodeBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generates a Google Wallet "Save" URL.
 *
 * In production with proper Issuer credentials, this would be a
 * signed JWT. For demo purposes, it generates an unsigned token
 * that showcases the full integration architecture.
 *
 * @param pass - Attendee pass record
 * @param event - Event record
 * @param zone - Zone record
 * @returns Google Wallet save URL string
 */
export function getWalletSaveUrl(
  pass: FlowPass,
  event: FlowEvent,
  zone: FlowZone
): string {
  try {
    const data = buildWalletPassData(pass, event, zone);
    const passJson = generatePassObject(data);

    // Google Wallet expects a JWT. 
    // For unsigned JWTs, it must be: base64url(header) + '.' + base64url(payload) + '.'
    const header = JSON.stringify({ alg: 'none', typ: 'JWT' });
    const unsignedJwt = `${encodeBase64Url(header)}.${encodeBase64Url(passJson)}.`;

    // Google Wallet expects the JWT as part of the URL path: /save/{jwt}
    return `${WALLET_SAVE_BASE_URL}/${unsignedJwt}`;
  } catch (error) {
    console.error('[GoogleWallet] Failed to generate save URL:', error);
    return '';
  }
}

/**
 * Checks if the current device likely supports Google Wallet.
 * Returns true for Android devices and Chrome on desktop.
 */
export function isWalletSupported(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('android') || ua.includes('chrome');
}
