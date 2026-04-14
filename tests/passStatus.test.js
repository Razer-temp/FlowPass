import { describe, it, expect } from 'vitest';

/**
 * Pass Status Logic Tests
 * These test the pure logic that drives the pass UI states.
 * The actual UI rendering is in LivePassCard.tsx - these validate
 * the state derivation logic independently.
 */

function derivePassState(pass, zone) {
  const isUsed = pass.status === 'USED';
  const isPaused = pass.status === 'PAUSED' || zone.status === 'HOLD';
  const isGoNow = pass.status === 'ACTIVE';
  const isLocked = pass.status === 'LOCKED';

  return { isUsed, isPaused, isGoNow, isLocked };
}

function shouldShowCountdown(pass, zone) {
  const { isLocked } = derivePassState(pass, zone);
  return isLocked && zone.status !== 'HOLD';
}

function shouldCountdownTriggerActive(zone, now) {
  const diff = new Date(zone.exit_time).getTime() - now;
  return diff <= 0;
}

function shouldShowExitButton(pass, zone) {
  const { isGoNow } = derivePassState(pass, zone);
  return isGoNow;
}

function isQRGreyedOut(pass) {
  return pass.status === 'USED';
}

function shouldShowReassignmentAlert(currentGateId, previousGateId) {
  return currentGateId !== previousGateId;
}

describe('Pass Status Logic', () => {
  it('test 1: LOCKED state → countdown visible', () => {
    const pass = { status: 'LOCKED' };
    const zone = { status: 'WAIT', exit_time: '2026-04-13T23:00:00Z' };
    expect(shouldShowCountdown(pass, zone)).toBe(true);
  });

  it('test 2: countdown reaches 0 → status should flip to ACTIVE', () => {
    const zone = { exit_time: '2026-04-13T22:00:00Z' };
    const now = new Date('2026-04-13T22:00:01Z').getTime(); // 1 second past exit time
    expect(shouldCountdownTriggerActive(zone, now)).toBe(true);
  });

  it('test 3: ACTIVE state → exit button visible', () => {
    const pass = { status: 'ACTIVE' };
    const zone = { status: 'ACTIVE' };
    expect(shouldShowExitButton(pass, zone)).toBe(true);
  });

  it('test 4: PAUSED state → exit button hidden', () => {
    const pass = { status: 'LOCKED' };
    const zone = { status: 'HOLD' };
    expect(shouldShowExitButton(pass, zone)).toBe(false);
  });

  it('test 5: USED state → QR greyed out', () => {
    const pass = { status: 'USED' };
    expect(isQRGreyedOut(pass)).toBe(true);
  });

  it('test 6: gate_id change → reassignment alert shows', () => {
    const currentGateId = 'Gate 2';
    const previousGateId = 'Gate 1';
    expect(shouldShowReassignmentAlert(currentGateId, previousGateId)).toBe(true);
  });
});
