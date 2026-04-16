import { describe, it, expect } from 'vitest';
import {
  sanitizeText,
  sanitizeName,
  sanitizeSeat,
  sanitizeMessage,
  sanitizeEventField,
  sanitizePin,
  isValidUUID
} from '../src/lib/sanitize';

describe('sanitizeText — XSS Prevention', () => {
  it('test 1: strips HTML tags', () => {
    expect(sanitizeText('<script>alert("xss")</script>Hello')).toBe('alert("xss")Hello');
  });

  it('test 2: removes javascript: protocol', () => {
    expect(sanitizeText('javascript:alert(1)')).toBe('alert(1)');
  });

  it('test 3: removes event handlers (onclick, onerror, etc.)', () => {
    expect(sanitizeText('onclick=alert(1)')).toBe('alert(1)');
    expect(sanitizeText('onerror =steal()')).toBe('steal()');
  });

  it('test 4: removes data: and vbscript: protocols', () => {
    expect(sanitizeText('data:text/html,<h1>hack</h1>')).not.toContain('data:');
    expect(sanitizeText('vbscript:msgbox("xss")')).not.toContain('vbscript:');
  });

  it('test 5: strips HTML comments', () => {
    expect(sanitizeText('Hello <!-- hidden --> World')).toBe('Hello  World');
  });

  it('test 6: handles null/undefined input gracefully', () => {
    expect(sanitizeText('')).toBe('');
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
  });
});

describe('sanitizeName — Attendee Name Validation', () => {
  it('test 7: allows normal names', () => {
    expect(sanitizeName('Rahul Sharma')).toBe('Rahul Sharma');
  });

  it('test 8: allows international names (Unicode)', () => {
    expect(sanitizeName('José García')).toBe('José García');
  });

  it('test 9: strips dangerous characters from names', () => {
    expect(sanitizeName('Rahul<script>alert(1)</script>')).toBe('Rahulalert');
  });

  it('test 10: enforces 50-char limit', () => {
    const longName = 'A'.repeat(100);
    expect(sanitizeName(longName).length).toBeLessThanOrEqual(50);
  });
});

describe('sanitizePin — PIN Validation', () => {
  it('test 11: allows alphanumeric PINs', () => {
    expect(sanitizePin('FLW-1234')).toBe('FLW-1234');
  });

  it('test 12: strips special characters from PIN', () => {
    expect(sanitizePin('FL!@#W-1')).toBe('FLW-1');
  });

  it('test 13: uppercases PIN', () => {
    expect(sanitizePin('abc123')).toBe('ABC123');
  });

  it('test 14: enforces 10-char max on PIN', () => {
    expect(sanitizePin('ABCDEFGHIJKLMNOP').length).toBeLessThanOrEqual(10);
  });
});

describe('isValidUUID — URL Parameter Validation', () => {
  it('test 15: accepts valid UUID', () => {
    expect(isValidUUID('a1b2c3d4-e5f6-7890-abcd-1234567890ef')).toBe(true);
  });

  it('test 16: rejects SQL injection in UUID param', () => {
    expect(isValidUUID("'; DROP TABLE passes; --")).toBe(false);
  });

  it('test 17: rejects empty/short strings', () => {
    expect(isValidUUID('')).toBe(false);
    expect(isValidUUID('abc')).toBe(false);
  });
});
