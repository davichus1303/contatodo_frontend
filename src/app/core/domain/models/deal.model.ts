import { DomainError, domainError } from '../errors/domain-error';
import { err, ok, Result } from '../result';
import { isBoolean, isFiniteNumber, isNonEmptyString, isRecord, optionalString } from '../validation/primitive.rules';

/**
 * Deal entity representing a product offer for a company.
 */
export interface Deal {
  readonly id: string;
  readonly productOid: string;
  readonly unitOfMeasureOid: string;
  readonly quantity: number;
  readonly price: number;
  readonly companyOid: string;
  readonly createdDate?: string;
  readonly updateDate?: string;
  readonly isActive: boolean;
  readonly isDelete: boolean;
}

/**
 * Builds a validated {@link Deal} from raw transport data.
 *
 * @param raw Raw payload, typically an API response item.
 * @returns Successful result with the deal, or every violation found.
 */
export function createDeal(raw: unknown): Result<Deal, readonly DomainError[]> {
  if (!isRecord(raw)) {
    return err([domainError('deal', 'Deal payload must be an object.')]);
  }

  const errors: DomainError[] = [];

  if (!isNonEmptyString(raw['id'])) {
    errors.push(domainError('id', 'Deal id must be a non-empty string.'));
  }
  if (!isNonEmptyString(raw['productOid'])) {
    errors.push(domainError('productOid', 'Deal productOid must be a non-empty string.'));
  }
  if (!isNonEmptyString(raw['unitOfMeasureOid'])) {
    errors.push(domainError('unitOfMeasureOid', 'Deal unitOfMeasureOid must be a non-empty string.'));
  }
  if (!isNonEmptyString(raw['companyOid'])) {
    errors.push(domainError('companyOid', 'Deal companyOid must be a non-empty string.'));
  }

  for (const field of ['quantity', 'price'] as const) {
    const value = raw[field];
    if (!isFiniteNumber(value)) {
      errors.push(domainError(field, `Deal ${field} must be a finite number.`));
    }
  }

  for (const field of ['isActive', 'isDelete'] as const) {
    const value = raw[field];
    if (value !== undefined && value !== null && !isBoolean(value)) {
      errors.push(domainError(field, `Deal ${field} must be a boolean when present.`));
    }
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok({
    id: (raw['id'] as string).trim(),
    productOid: (raw['productOid'] as string).trim(),
    unitOfMeasureOid: (raw['unitOfMeasureOid'] as string).trim(),
    companyOid: (raw['companyOid'] as string).trim(),
    quantity: raw['quantity'] as number,
    price: raw['price'] as number,
    createdDate: optionalString(raw['createdDate']),
    updateDate: optionalString(raw['updateDate']),
    isActive: raw['isActive'] === true,
    isDelete: raw['isDelete'] === true
  });
}
