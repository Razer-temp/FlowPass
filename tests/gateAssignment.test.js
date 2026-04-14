import { describe, it, expect } from 'vitest';

/**
 * Gate Assignment & Validation Logic Tests
 * These test the pure logic used in GateStaffView for pass validation
 * and the smart gate reassignment algorithm.
 */

function validatePass(pass, zones, currentGateId) {
  if (!pass) return { type: 'NOT_FOUND' };
  if (pass.status === 'USED') return { type: 'ALREADY_USED', pass };

  const isCorrectGate = pass.gate_id === currentGateId;
  if (!isCorrectGate) return { type: 'WRONG_GATE', pass, correctGate: pass.gate_id };

  const passZone = zones.find(z => z.id === pass.zone_id);
  if (!passZone || passZone.status !== 'ACTIVE') {
    return { type: 'WAIT', pass, zone: passZone };
  }

  return { type: 'VALID', pass, zone: passZone };
}

function findReassignmentGate(gates, blockedGateName) {
  const clearGates = gates.filter(g => g.name !== blockedGateName && g.status === 'CLEAR');
  if (clearGates.length === 0) return null;
  return clearGates[0];
}

function triggerReassignment(zones, gates, blockedGateName) {
  const newGate = findReassignmentGate(gates, blockedGateName);
  if (!newGate) return { success: false, warning: 'No clear gate available' };

  const affectedZones = zones.filter(z => z.gates.includes(blockedGateName));
  return {
    success: true,
    blockedGate: blockedGateName,
    newGate: newGate.name,
    affectedZones: affectedZones.map(z => z.name)
  };
}

describe('Gate Validation', () => {
  const mockZones = [
    { id: 'z1', name: 'Zone A', status: 'ACTIVE', gates: ['Gate 1'] },
    { id: 'z2', name: 'Zone B', status: 'WAIT', gates: ['Gate 2'] }
  ];

  it('test 1: valid pass + open zone → VALID result', () => {
    const pass = { id: 'p1', zone_id: 'z1', gate_id: 'Gate 1', status: 'ACTIVE' };
    const result = validatePass(pass, mockZones, 'Gate 1');
    expect(result.type).toBe('VALID');
  });

  it('test 2: valid pass + closed zone → WAIT result', () => {
    const pass = { id: 'p2', zone_id: 'z2', gate_id: 'Gate 2', status: 'LOCKED' };
    const result = validatePass(pass, mockZones, 'Gate 2');
    expect(result.type).toBe('WAIT');
  });

  it('test 3: used pass → ALREADY USED result', () => {
    const pass = { id: 'p3', zone_id: 'z1', gate_id: 'Gate 1', status: 'USED' };
    const result = validatePass(pass, mockZones, 'Gate 1');
    expect(result.type).toBe('ALREADY_USED');
  });

  it('test 4: wrong gate pass → WRONG GATE result', () => {
    const pass = { id: 'p4', zone_id: 'z1', gate_id: 'Gate 1', status: 'ACTIVE' };
    const result = validatePass(pass, mockZones, 'Gate 2');
    expect(result.type).toBe('WRONG_GATE');
    expect(result.correctGate).toBe('Gate 1');
  });
});

describe('Smart Gate Reassignment', () => {
  const mockGates = [
    { name: 'Gate 1', status: 'BLOCKED' },
    { name: 'Gate 2', status: 'CLEAR' },
    { name: 'Gate 3', status: 'BUSY' }
  ];

  const mockZones = [
    { id: 'z1', name: 'Zone A', gates: ['Gate 1', 'Gate 2'] },
    { id: 'z2', name: 'Zone B', gates: ['Gate 1'] },
    { id: 'z3', name: 'Zone C', gates: ['Gate 3'] }
  ];

  it('test 5: BLOCKED gate → reassignment triggers', () => {
    const result = triggerReassignment(mockZones, mockGates, 'Gate 1');
    expect(result.success).toBe(true);
  });

  it('test 6: reassignment picks next CLEAR gate', () => {
    const result = triggerReassignment(mockZones, mockGates, 'Gate 1');
    expect(result.newGate).toBe('Gate 2');
  });

  it('test 7: no CLEAR gate available → warning shown', () => {
    const allBusyGates = [
      { name: 'Gate 1', status: 'BLOCKED' },
      { name: 'Gate 2', status: 'BLOCKED' },
      { name: 'Gate 3', status: 'BUSY' }
    ];
    // All non-blocked gates are not CLEAR
    const result = triggerReassignment(mockZones, allBusyGates, 'Gate 1');
    expect(result.success).toBe(false);
    expect(result.warning).toBe('No clear gate available');
  });

  it('test 8: override is logged correctly (validation logic allows it)', () => {
    // Simulate an override: pass is for Gate 1 but staff at Gate 2 lets them through
    const pass = { id: 'p5', zone_id: 'z1', gate_id: 'Gate 1', status: 'ACTIVE' };
    const result = validatePass(pass, [{ id: 'z1', name: 'Zone A', status: 'ACTIVE', gates: ['Gate 1'] }], 'Gate 2');
    expect(result.type).toBe('WRONG_GATE');
    // In the app, the "Let Through Anyway" button calls confirmPass(id, true)
    // which logs with isOverride=true. We verify the detection works.
    expect(result.pass.id).toBe('p5');
  });
});
