/**
 * Primitive, framework-free validation predicates and normalizers shared by
 * every entity factory. Each predicate narrows the `unknown` input so
 * factories can safely build typed models afterwards; normalizers turn an
 * already-accepted `unknown` into the domain representation of a field.
 */

/**
 * Checks whether a value is a string with non-blank content.
 *
 * @param value Value under test.
 * @returns True when the value is a string containing non-whitespace characters.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Checks whether a value is a finite number (rejects NaN and Infinity).
 *
 * @param value Value under test.
 * @returns True when the value is a finite number.
 */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Checks whether a value is strictly boolean.
 *
 * @param value Value under test.
 * @returns True when the value is a boolean.
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Checks whether a value is a plain object (not null, not an array).
 *
 * @param value Value under test.
 * @returns True when the value is a record-like object.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Normalizes an optional textual value to the domain standard.
 *
 * Absent, `null`, non-string and blank values collapse to `undefined`;
 * otherwise the trimmed string is returned. Callers are expected to have
 * validated the field first, so this function never throws.
 *
 * @param value Value under normalization.
 * @returns Trimmed string, or `undefined` when there is no usable text.
 */
export function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
