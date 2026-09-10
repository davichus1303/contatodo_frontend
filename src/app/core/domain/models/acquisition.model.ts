import { DomainError, domainError } from '../errors/domain-error';
import { err, ok, Result } from '../result';
import { isFiniteNumber, isNonEmptyString, isRecord } from '../validation/primitive.rules';

/**
 * Acquisition entity of the purchases domain.
 */
export interface Acquisition {
  readonly id: string;
  readonly productName: string;
  readonly acquisitionType: string;
  readonly quantity: number;
  readonly realCost: number;
  readonly unitRealCost: number;
  readonly unitPublicCost: number;
  readonly supplierName: string;
  readonly invoiceNumber: string;
  readonly acquisitionDate: string;
  readonly observations: string;
}

/**
 * Builds a validated {@link Acquisition} from raw transport data.
 *
 * Load-bearing invariants are enforced: the payload must be an object, `id`
 * must be a non-empty string and every monetary/quantity field, when
 * present, must be a finite number. All other fields flow through untouched.
 *
 * @param raw Raw payload, typically an API list item.
 * @returns Successful result with the acquisition, or every violation found.
 */
export function createAcquisition(raw: unknown): Result<Acquisition, readonly DomainError[]> {
  if (!isRecord(raw)) {
    return err([domainError('acquisition', 'Acquisition payload must be an object.')]);
  }

  const errors: DomainError[] = [];

  if (!isNonEmptyString(raw['id'])) {
    errors.push(domainError('id', 'Acquisition id must be a non-empty string.'));
  }

  const numericFields = ['quantity', 'realCost', 'unitRealCost', 'unitPublicCost'] as const;
  for (const field of numericFields) {
    const value = raw[field];
    if (value !== undefined && value !== null && !isFiniteNumber(value)) {
      errors.push(domainError(field, `Acquisition ${field} must be a finite number when present.`));
    }
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(raw as unknown as Acquisition);
}
