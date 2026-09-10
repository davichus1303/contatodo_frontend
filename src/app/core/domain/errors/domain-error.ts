/**
 * Describes a single domain rule violation.
 */
export interface DomainError {
  /**
   * Name of the offending field (or entity when the whole payload is invalid).
   */
  readonly field: string;

  /**
   * Human-readable, technical explanation of the violation.
   */
  readonly message: string;
}

/**
 * Builds a {@link DomainError}.
 *
 * @param field Field that violates the rule.
 * @param message Explanation of the violation.
 * @returns Structured domain error.
 */
export function domainError(field: string, message: string): DomainError {
  return { field, message };
}
