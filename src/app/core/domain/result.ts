/**
 * Discriminated union representing the outcome of a domain operation that
 * can fail validation.
 *
 * `ok` carries the produced value; `err` carries every rule violation found.
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/**
 * Wraps a successful value into a {@link Result}.
 *
 * @param value Produced value.
 * @returns Successful result carrying `value`.
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Wraps a failure into a {@link Result}.
 *
 * @param error Collected error(s).
 * @returns Failed result carrying `error`.
 */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
