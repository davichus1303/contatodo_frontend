import { DomainError, domainError } from '../errors/domain-error';
import { err, ok, Result } from '../result';
import { isBoolean, isNonEmptyString, isRecord, optionalString } from '../validation/primitive.rules';

/**
 * Acquisition type entity (catalog of purchase categories).
 */
export interface AcquisitionType {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly isActive: boolean;
  readonly isDeleted: boolean;
  readonly affectsInventory?: boolean;
  readonly createdDate?: string;
  readonly updatedDate?: string;
}

/**
 * Builds a validated {@link AcquisitionType} from raw transport data.
 *
 * Load-bearing invariants are enforced: the payload must be an object and
 * `id`/`name` must be non-empty strings. Text fields are normalized
 * (trimmed), the status flags are coerced to booleans and the optional
 * `affectsInventory` collapses to `undefined` when absent.
 *
 * @param raw Raw payload, typically an API list item.
 * @returns Successful result with the acquisition type, or every violation found.
 */
export function createAcquisitionType(raw: unknown): Result<AcquisitionType, readonly DomainError[]> {
  if (!isRecord(raw)) {
    return err([domainError('acquisitionType', 'Acquisition type payload must be an object.')]);
  }

  const errors: DomainError[] = [];

  if (!isNonEmptyString(raw['id'])) {
    errors.push(domainError('id', 'Acquisition type id must be a non-empty string.'));
  }
  if (!isNonEmptyString(raw['name'])) {
    errors.push(domainError('name', 'Acquisition type name must be a non-empty string.'));
  }
  for (const field of ['isActive', 'isDeleted', 'affectsInventory'] as const) {
    const value = raw[field];
    if (value !== undefined && value !== null && !isBoolean(value)) {
      errors.push(domainError(field, `Acquisition type ${field} must be a boolean when present.`));
    }
  }

  if (errors.length > 0) {
    return err(errors);
  }

  const affectsInventory = raw['affectsInventory'];

  return ok({
    id: (raw['id'] as string).trim(),
    name: (raw['name'] as string).trim(),
    description: optionalString(raw['description']),
    isActive: raw['isActive'] === true,
    isDeleted: raw['isDeleted'] === true,
    affectsInventory: typeof affectsInventory === 'boolean' ? affectsInventory : undefined,
    createdDate: optionalString(raw['createdDate']),
    updatedDate: optionalString(raw['updatedDate'])
  });
}
