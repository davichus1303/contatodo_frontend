import { DomainError, domainError } from '../errors/domain-error';
import { err, ok, Result } from '../result';
import { isBoolean, isNonEmptyString, isRecord, optionalString } from '../validation/primitive.rules';

/**
 * Unit of measure entity (catalog of measurement units).
 */
export interface UnitOfMeasure {
  readonly id: string;
  readonly name: string;
  readonly abrev: string;
  readonly isActive: boolean;
  readonly isDeleted: boolean;
  readonly companyOid?: string;
  readonly createdDate?: string;
  readonly updatedDate?: string;
}

/**
 * Builds a validated {@link UnitOfMeasure} from raw transport data.
 */
export function createUnitOfMeasure(raw: unknown): Result<UnitOfMeasure, readonly DomainError[]> {
  if (!isRecord(raw)) {
    return err([domainError('unitOfMeasure', 'Unit of measure payload must be an object.')]);
  }

  const errors: DomainError[] = [];

  if (!isNonEmptyString(raw['id'])) {
    errors.push(domainError('id', 'Unit of measure id must be a non-empty string.'));
  }
  if (!isNonEmptyString(raw['name'])) {
    errors.push(domainError('name', 'Unit of measure name must be a non-empty string.'));
  }
  if (!isNonEmptyString(raw['abrev'])) {
    errors.push(domainError('abrev', 'Unit of measure abrev must be a non-empty string.'));
  }
  for (const field of ['isActive', 'isDeleted'] as const) {
    const value = raw[field];
    if (value !== undefined && value !== null && !isBoolean(value)) {
      errors.push(domainError(field, `Unit of measure ${field} must be a boolean when present.`));
    }
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok({
    id: (raw['id'] as string).trim(),
    name: (raw['name'] as string).trim(),
    abrev: (raw['abrev'] as string).trim(),
    isActive: raw['isActive'] === true,
    isDeleted: raw['isDeleted'] === true,
    companyOid: optionalString(raw['companyOid']),
    createdDate: optionalString(raw['createdDate']),
    updatedDate: optionalString(raw['updatedDate'])
  });
}
