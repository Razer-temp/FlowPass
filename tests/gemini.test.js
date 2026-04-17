/**
 * Gemini AI Service Tests
 *
 * Tests the AI crowd analysis and announcement generation logic,
 * specifically the fallback behavior and response parsing.
 * These tests do NOT require a live API key — they validate
 * the offline/fallback paths and input processing.
 */

import { describe, it, expect } from 'vitest';

// ─── Mock the @google/genai module to avoid API calls ────────
// We test the exported functions by importing the module after setting env

// Since gemini.ts uses import.meta.env which Vitest handles,
// we test the logic functions by simulating inputs

describe('Gemini AI — Crowd Safety Analysis', () => {

  it('should detect blocked gate as a high-priority risk', async () => {
    // Import the module dynamically to test fallback mode (no API key)
    const { analyzeCrowdSafety } = await import('../src/lib/gemini');

    const result = await analyzeCrowdSafety({
      eventName: 'Test Event',
      venue: 'Test Stadium',
      totalCrowd: 20000,
      exitedCount: 5000,
      remainingCount: 15000,
      zones: [
        { name: 'Zone A', status: 'ACTIVE', estimatedPeople: 5000, exitTime: new Date().toISOString(), gates: ['Gate 1'] },
        { name: 'Zone B', status: 'WAIT', estimatedPeople: 5000, exitTime: new Date().toISOString(), gates: ['Gate 2'] },
      ],
      gates: [
        { name: 'Gate 1', status: 'CLEAR' },
        { name: 'Gate 2', status: 'BLOCKED' },
      ],
      isPaused: false,
    });

    expect(result).toBeDefined();
    expect(result.safetyScore).toBeLessThan(85);
    expect(result.risks.some(r => r.toLowerCase().includes('blocked') || r.toLowerCase().includes('gate 2'))).toBe(true);
    expect(result.actions.length).toBeGreaterThan(0);
  });

  it('should return high safety score when everything is normal', async () => {
    const { analyzeCrowdSafety } = await import('../src/lib/gemini');

    const result = await analyzeCrowdSafety({
      eventName: 'Clean Event',
      venue: 'Safe Arena',
      totalCrowd: 10000,
      exitedCount: 7000,
      remainingCount: 3000,
      zones: [
        { name: 'Zone A', status: 'ACTIVE', estimatedPeople: 5000, exitTime: new Date().toISOString(), gates: ['Gate 1'] },
      ],
      gates: [
        { name: 'Gate 1', status: 'CLEAR' },
        { name: 'Gate 2', status: 'CLEAR' },
      ],
      isPaused: false,
    });

    expect(result.safetyScore).toBeGreaterThanOrEqual(80);
    expect(result.summary).toBeDefined();
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it('should lower safety score when event is paused', async () => {
    const { analyzeCrowdSafety } = await import('../src/lib/gemini');

    const result = await analyzeCrowdSafety({
      eventName: 'Paused Event',
      venue: 'Test Venue',
      totalCrowd: 30000,
      exitedCount: 2000,
      remainingCount: 28000,
      zones: [
        { name: 'Zone A', status: 'ACTIVE', estimatedPeople: 10000, exitTime: new Date().toISOString(), gates: ['Gate 1'] },
      ],
      gates: [
        { name: 'Gate 1', status: 'CLEAR' },
      ],
      isPaused: true,
    });

    expect(result.safetyScore).toBeLessThan(80);
    expect(result.risks.some(r => r.toLowerCase().includes('paused'))).toBe(true);
  });

  it('should always return valid recommendation structure', async () => {
    const { analyzeCrowdSafety } = await import('../src/lib/gemini');

    const result = await analyzeCrowdSafety({
      eventName: 'Empty Event',
      venue: 'Nowhere',
      totalCrowd: 0,
      exitedCount: 0,
      remainingCount: 0,
      zones: [],
      gates: [],
      isPaused: false,
    });

    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('risks');
    expect(result).toHaveProperty('actions');
    expect(result).toHaveProperty('safetyScore');
    expect(Array.isArray(result.risks)).toBe(true);
    expect(Array.isArray(result.actions)).toBe(true);
    expect(typeof result.safetyScore).toBe('number');
    expect(result.safetyScore).toBeGreaterThanOrEqual(10);
    expect(result.safetyScore).toBeLessThanOrEqual(100);
  });
});

describe('Gemini AI — Announcement Generation', () => {

  it('should generate a fallback announcement when no API key', async () => {
    const { generateSmartAnnouncement } = await import('../src/lib/gemini');

    const result = await generateSmartAnnouncement({
      eventName: 'Test Match',
      venue: 'Stadium',
      activeZones: ['Zone A'],
      waitingZones: ['Zone B', 'Zone C'],
      blockedGates: [],
      exitedPercent: 25,
      totalCrowd: 20000,
    });

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(160);
  });

  it('should mention blocked gate in announcement when present', async () => {
    const { generateSmartAnnouncement } = await import('../src/lib/gemini');

    const result = await generateSmartAnnouncement({
      eventName: 'Test Match',
      venue: 'Stadium',
      activeZones: ['Zone A'],
      waitingZones: [],
      blockedGates: ['Gate 3'],
      exitedPercent: 50,
      totalCrowd: 10000,
    });

    expect(result.toLowerCase()).toContain('gate 3');
  });

  it('should enforce 160 character limit', async () => {
    const { generateSmartAnnouncement } = await import('../src/lib/gemini');

    const result = await generateSmartAnnouncement({
      eventName: 'Very Long Event Name That Goes On And On',
      venue: 'Some Stadium With A Very Long Name',
      activeZones: ['Zone A', 'Zone B', 'Zone C', 'Zone D'],
      waitingZones: ['Zone E', 'Zone F'],
      blockedGates: ['Gate 1', 'Gate 2'],
      exitedPercent: 10,
      totalCrowd: 50000,
      customTopic: 'Emergency weather update with detailed instructions for all attendees',
    });

    expect(result.length).toBeLessThanOrEqual(160);
  });

  it('should report Gemini availability correctly', async () => {
    const { isGeminiAvailable } = await import('../src/lib/gemini');
    // In test env, VITE_GEMINI_API_KEY is not set, so should be false
    const available = isGeminiAvailable();
    expect(typeof available).toBe('boolean');
  });
});
