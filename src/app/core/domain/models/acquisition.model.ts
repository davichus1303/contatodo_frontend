import { DomainError, domainError } from '../errors/domain-error';
import { err, ok, Result } from '../result';
import {
  isFiniteNumber,
  isNonEmptyString,
  isRecord,
  optionalNumber,
  optionalString
} from '../validation/primitive.rules';

/**
 * Acquisition entity of the purchases domain.
 */
export interface Acquisition {
  readonly id: string;
  readonly productName: string;
  readonly acquisitionType: string;
  readonly quantity?: number;
  readonly realCost: number;
  readonly unitRealCost: number;
  readonly unitPublicCost?: number;
  readonly supplierName?: string;
  readonly invoiceNumber?: string;
  readonly acquisitionDate: string;
  readonly observations?: string;
}

/**
 * Builds a validated {@link Acquisition} from raw transport data.
 *
 * Load-bearing invariants are enforced: the payload must be an object, `id`,
 * `productName`, `acquisitionType` and `acquisitionDate` must be non-empty
 * strings and `realCost`/`unitRealCost` must be finite numbers. Optional
 * numeric/text fields collapse to `undefined` when absent, `null` or blank,
 * which mirrors the backend contract (non-inventory acquisitions carry no
 * quantity/unit public cost and supplier/invoice/observations are nullable).
 *
 * @param raw Raw payload, typically an API list item.
 * @returns Successful result with the acquisition, or every violation found.
 */
export function createAcquisition(raw: unknown): Result<Acquisition, readonly DomainError[]> {
  if (!isRecord(raw)) {
    return err([domainError('acquisition', 'Acquisition payload must be an object.')]);
  }

  const errors: DomainError[] = [];

  for (const field of ['id', 'productName', 'acquisitionType', 'acquisitionDate'] as const) {
    if (!isNonEmptyString(raw[field])) {
      errors.push(domainError(field, `Acquisition ${field} must be a non-empty string.`));
    }
  }

  for (const field of ['realCost', 'unitRealCost'] as const) {
    if (!isFiniteNumber(raw[field])) {
      errors.push(domainError(field, `Acquisition ${field} must be a finite number.`));
    }
  }

  for (const field of ['quantity', 'unitPublicCost'] as const) {
    const value = raw[field];
    if (value !== undefined && value !== null && !isFiniteNumber(value)) {
      errors.push(domainError(field, `Acquisition ${field} must be a finite number when present.`));
    }
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok({
    id: (raw['id'] as string).trim(),
    productName: (raw['productName'] as string).trim(),
    acquisitionType: (raw['acquisitionType'] as string).trim(),
    quantity: optionalNumber(raw['quantity']),
    realCost: raw['realCost'] as number,
    unitRealCost: raw['unitRealCost'] as number,
    unitPublicCost: optionalNumber(raw['unitPublicCost']),
    supplierName: optionalString(raw['supplierName']),
    invoiceNumber: optionalString(raw['invoiceNumber']),
    acquisitionDate: (raw['acquisitionDate'] as string).trim(),
    observations: optionalString(raw['observations'])
  });
}
