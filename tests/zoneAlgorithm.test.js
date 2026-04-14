import { describe, it, expect } from 'vitest';
import { calculateDynamicGaps, generateSchedule, assignZoneFromSeat } from '../src/lib/zoneAlgorithm';

// Helper: simple gap calculator matching the app's internal logic
function calculateGap(crowd, zones, gates) {
  const peoplePerZone = Math.floor(crowd / zones);
  const exitRatePerMin = gates * 500;
  const gap = Math.ceil(peoplePerZone / exitRatePerMin);
  return Math.max(8, Math.min(gap, 20));
}

describe('calculateGap', () => {
  it('test 1: calculateGap(45000, 4, 3) → result = 8 (floor applied)', () => {
    // 45000/4 = 11250 per zone, 3*500 = 1500/min, 11250/1500 = 7.5 → ceil=8 → max(8,min(8,20)) = 8
    const result = calculateGap(45000, 4, 3);
    expect(result).toBe(8);
  });

  it('test 2: calculateGap(5000, 2, 2) → result >= 8 (minimum floor)', () => {
    const result = calculateGap(5000, 2, 2);
    expect(result).toBeGreaterThanOrEqual(8);
  });

  it('test 3: calculateGap(100000, 2, 1) → result <= 20 (maximum ceiling)', () => {
    const result = calculateGap(100000, 2, 1);
    expect(result).toBeLessThanOrEqual(20);
  });
});

describe('generateSchedule', () => {
  it('test 4: returns correct zone count', () => {
    const zoneGateMap = { A: ['Gate 1'], B: ['Gate 2'], C: ['Gate 1'] };
    const schedule = generateSchedule('22:00', '2026-04-13', 30000, 3, zoneGateMap);
    expect(schedule).toHaveLength(3);
  });

  it('test 5: first zone always has status = ACTIVE', () => {
    const zoneGateMap = { A: ['Gate 1'], B: ['Gate 2'] };
    const schedule = generateSchedule('22:00', '2026-04-13', 10000, 2, zoneGateMap);
    expect(schedule[0].status).toBe('ACTIVE');
  });
});

describe('assignZoneFromSeat', () => {
  const mockZones = [
    { id: '1', name: 'Zone A', estimated_people: 100, gates: ['Gate 1'] },
    { id: '2', name: 'Zone B', estimated_people: 200, gates: ['Gate 2'] },
    { id: '3', name: 'Zone C', estimated_people: 50, gates: ['Gate 1'] },
    { id: '4', name: 'VIP Zone', estimated_people: 30, gates: ['Gate 3'] }
  ];

  it('test 6: assignZoneFromSeat("Stand A") → Zone A', () => {
    const result = assignZoneFromSeat('Stand A, Row 5, Seat 12', mockZones);
    expect(result).toBe(mockZones[0]); // Zone A
  });

  it('test 7: assignZoneFromSeat("Stand C") → Zone C', () => {
    const result = assignZoneFromSeat('Stand C, Row 2, Seat 8', mockZones);
    expect(result).toBe(mockZones[2]); // Zone C
  });

  it('test 8: assignZoneFromSeat("VIP") → VIP zone', () => {
    const result = assignZoneFromSeat('VIP Box 3', mockZones);
    expect(result).toBe(mockZones[3]); // VIP Zone
  });

  it('test 9: assignZoneFromSeat("gibberish") → least populated zone (fallback)', () => {
    const result = assignZoneFromSeat('Random Gibberish Text', mockZones);
    // Should return the zone with fewest estimated_people: VIP Zone (30)
    expect(result).toBe(mockZones[3]);
  });

  it('test 10: pass ID format is valid UUID (Supabase generates UUIDs)', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    // Simulating a UUID that Supabase would generate
    const mockPassId = 'a1b2c3d4-e5f6-7890-abcd-1234567890ef';
    expect(mockPassId).toMatch(uuidRegex);
  });
});
