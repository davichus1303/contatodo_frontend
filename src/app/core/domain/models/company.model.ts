import { DomainError, domainError } from '../errors/domain-error';
import { err, ok, Result } from '../result';
import { isBoolean, isNonEmptyString, isRecord } from '../validation/primitive.rules';

/**
 * Company entity as returned by the companies catalog endpoint.
 *
 * The backend resolves the related contact user, so `contactName` and
 * `contactPhone` are only present when a contact could be resolved.
 */
export interface Company {
  readonly id: string;
  readonly name: string;
  readonly rfc?: string | null;
  readonly webSite?: string | null;
  readonly ubication?: string | null;
  readonly contactUserOId?: string | null;
  readonly contactName?: string | null;
  readonly contactPhone?: string | null;
  readonly isActive: boolean;
  readonly isDeleted: boolean;
}

/**
 * Builds a validated {@link Company} from raw transport data.
 *
 * Load-bearing invariants are enforced: the payload must be an object and
 * `id`/`name` must be non-empty strings. Optional textual fields must be
 * strings when present, and the status flags must be booleans when present.
 *
 * @param raw Raw payload, typically an API list item.
 * @returns Successful result with the company, or every violation found.
 */
export function createCompany(raw: unknown): Result<Company, readonly DomainError[]> {
  if (!isRecord(raw)) {
    return err([domainError('company', 'Company payload must be an object.')]);
  }

  const errors: DomainError[] = [];

  if (!isNonEmptyString(raw['id'])) {
    errors.push(domainError('id', 'Company id must be a non-empty string.'));
  }
  if (!isNonEmptyString(raw['name'])) {
    errors.push(domainError('name', 'Company name must be a non-empty string.'));
  }
  for (const field of [
    'rfc',
    'webSite',
    'ubication',
    'contactUserOId',
    'contactName',
    'contactPhone'
  ] as const) {
    const value = raw[field];
    if (value !== undefined && value !== null && typeof value !== 'string') {
      errors.push(domainError(field, `Company ${field} must be a string when present.`));
    }
  }
  for (const field of ['isActive', 'isDeleted'] as const) {
    const value = raw[field];
    if (value !== undefined && value !== null && !isBoolean(value)) {
      errors.push(domainError(field, `Company ${field} must be a boolean when present.`));
    }
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(raw as unknown as Company);
}
