import { DomainError, domainError } from '../errors/domain-error';
import { err, ok, Result } from '../result';
import { isFiniteNumber, isNonEmptyString, isRecord } from '../validation/primitive.rules';

/**
 * Sale entity of the sales domain.
 */
export interface Sale {
  readonly id: string;
  readonly saleNumber: number;
  readonly productOid: string;
  readonly productName?: string;
  readonly userOid: string;
  readonly quantity: number;
  readonly totalCost: number;
  readonly originalTotalPrice: number;
  readonly totalSalePrice: number;
  readonly saleDate: string;
  readonly notes: string;
  readonly createdDate: string;
  readonly updatedDate: string;
}

/**
 * Builds a validated {@link Sale} from raw transport data.
 *
 * Load-bearing invariants are enforced: the payload must be an object, `id`
 * must be a non-empty string and every monetary/quantity field, when
 * present, must be a finite number. All other fields flow through untouched.
 *
 * @param raw Raw payload, typically an API list item.
 * @returns Successful result with the sale, or every violation found.
 */
export function createSale(raw: unknown): Result<Sale, readonly DomainError[]> {
  if (!isRecord(raw)) {
    return err([domainError('sale', 'Sale payload must be an object.')]);
  }

  const errors: DomainError[] = [];

  if (!isNonEmptyString(raw['id'])) {
    errors.push(domainError('id', 'Sale id must be a non-empty string.'));
  }

  const numericFields = [
    'saleNumber',
    'quantity',
    'totalCost',
    'originalTotalPrice',
    'totalSalePrice'
  ] as const;
  for (const field of numericFields) {
    const value = raw[field];
    if (value !== undefined && value !== null && !isFiniteNumber(value)) {
      errors.push(domainError(field, `Sale ${field} must be a finite number when present.`));
    }
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(raw as unknown as Sale);
}
