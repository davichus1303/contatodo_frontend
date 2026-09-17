/**
 * Returns a value ready for display, falling back when it is empty.
 *
 * A value is considered empty when it is nullish or contains only whitespace.
 *
 * @param value Raw value to display.
 * @param fallback Text shown when the value is empty.
 * @returns The original value when present, otherwise the fallback.
 */
export function displayOrFallback(value: string | null | undefined, fallback: string): string {
  return value?.trim() ? value : fallback;
}
