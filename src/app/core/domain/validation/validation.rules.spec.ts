import { isValidEmail } from './email.rule';
import { isBoolean, isFiniteNumber, isNonEmptyString, isRecord, optionalNumber, optionalString } from './primitive.rules';

describe('primitive rules', () => {
  describe('isNonEmptyString', () => {
    it('should accept strings with non-whitespace content', () => {
      expect(isNonEmptyString('product')).toBeTrue();
      expect(isNonEmptyString('  x  ')).toBeTrue();
    });

    it('should reject empty, blank and non-string values', () => {
      expect(isNonEmptyString('')).toBeFalse();
      expect(isNonEmptyString('   ')).toBeFalse();
      expect(isNonEmptyString(42)).toBeFalse();
      expect(isNonEmptyString(null)).toBeFalse();
      expect(isNonEmptyString(undefined)).toBeFalse();
    });
  });

  describe('isFiniteNumber', () => {
    it('should accept finite numbers including zero and negatives', () => {
      expect(isFiniteNumber(0)).toBeTrue();
      expect(isFiniteNumber(-3.5)).toBeTrue();
      expect(isFiniteNumber(Number.MAX_SAFE_INTEGER)).toBeTrue();
    });

    it('should reject NaN, Infinity and non-number values', () => {
      expect(isFiniteNumber(Number.NaN)).toBeFalse();
      expect(isFiniteNumber(Number.POSITIVE_INFINITY)).toBeFalse();
      expect(isFiniteNumber('12')).toBeFalse();
      expect(isFiniteNumber(null)).toBeFalse();
    });
  });

  describe('isBoolean', () => {
    it('should accept only booleans', () => {
      expect(isBoolean(true)).toBeTrue();
      expect(isBoolean(false)).toBeTrue();
      expect(isBoolean(0)).toBeFalse();
      expect(isBoolean('true')).toBeFalse();
    });
  });

  describe('isRecord', () => {
    it('should accept plain objects', () => {
      expect(isRecord({})).toBeTrue();
      expect(isRecord({ id: '1' })).toBeTrue();
    });

    it('should reject null, arrays and primitives', () => {
      expect(isRecord(null)).toBeFalse();
      expect(isRecord([1, 2])).toBeFalse();
      expect(isRecord('obj')).toBeFalse();
      expect(isRecord(undefined)).toBeFalse();
    });
  });

  describe('optionalString', () => {
    it('should trim strings with content', () => {
      expect(optionalString('  Acme  ')).toBe('Acme');
    });

    it('should collapse absent, null and blank values to undefined', () => {
      expect(optionalString(undefined)).toBeUndefined();
      expect(optionalString(null)).toBeUndefined();
      expect(optionalString('')).toBeUndefined();
      expect(optionalString('   ')).toBeUndefined();
    });

    it('should collapse non-string values to undefined', () => {
      expect(optionalString(42)).toBeUndefined();
      expect(optionalString(true)).toBeUndefined();
      expect(optionalString({})).toBeUndefined();
    });
  });

  describe('optionalNumber', () => {
    it('should keep finite numbers including zero', () => {
      expect(optionalNumber(0)).toBe(0);
      expect(optionalNumber(-3.5)).toBe(-3.5);
    });

    it('should collapse absent, null and non-finite values to undefined', () => {
      expect(optionalNumber(undefined)).toBeUndefined();
      expect(optionalNumber(null)).toBeUndefined();
      expect(optionalNumber(Number.NaN)).toBeUndefined();
      expect(optionalNumber(Number.POSITIVE_INFINITY)).toBeUndefined();
      expect(optionalNumber('12')).toBeUndefined();
      expect(optionalNumber({})).toBeUndefined();
    });
  });
});

describe('isValidEmail', () => {
  it('should accept valid email addresses accepted by Angular Validators.email parity pattern', () => {
    expect(isValidEmail('user@example.com')).toBeTrue();
    expect(isValidEmail('first.last@sub.domain.org')).toBeTrue();
    expect(isValidEmail('user+tag@example.io')).toBeTrue();
  });

  it('should reject malformed addresses', () => {
    expect(isValidEmail('plainaddress')).toBeFalse();
    expect(isValidEmail('@missing-local.com')).toBeFalse();
    expect(isValidEmail('user@')).toBeFalse();
    expect(isValidEmail('user@localhost')).toBeFalse();
    expect(isValidEmail('user @space.com')).toBeFalse();
  });

  it('should respect length constraints (254 total, 64 local)', () => {
    const longLocal = 'a'.repeat(65);
    const okLocal = 'a'.repeat(64);
    const hugeTotal = `${'b'.repeat(250)}@example.com`;

    expect(isValidEmail(`${longLocal}@example.com`)).toBeFalse();
    expect(isValidEmail(`${okLocal}@example.com`)).toBeTrue();
    expect(isValidEmail(hugeTotal)).toBeFalse();
  });
});
