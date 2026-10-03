import { DomainError, domainError } from '../errors/domain-error';
import { err, ok, Result } from '../result';
import { isBoolean, isRecord } from './primitive.rules';
import { GENERAL_CONSTANTS } from '@shared/constants/general.constants';

/**
 * Permission flags a role holds over a single module.
 *
 * The four keys are the actions the backend can grant, and they match the
 * `Permissions` payload it returns both in the roles catalog and inside the
 * `permissionOfRole` claim.
 */
export interface PermissionFlags {
  readonly create: boolean;
  readonly update: boolean;
  readonly delete: boolean;
  readonly view: boolean;
}

/**
 * Builds validated {@link PermissionFlags} from a raw `permissions` payload.
 *
 * A flag that arrives `null` or absent is read as `false`, which is what the
 * backend means by it: a permission document written before a flag existed
 * leaves it unset, and an unset flag is never granted. The backend applies the
 * same rule on its side, so both ends agree on a user without that permission.
 *
 * Rejecting the whole payload over an unset flag would be wrong here, because
 * the permissions are read as a set: one unset flag would discard the granted
 * ones too and leave the session with no access at all. A flag of the wrong
 * type is still a contract violation and is reported.
 *
 * @param raw Raw `permissions` payload.
 * @param path Field path used when reporting a violation.
 * @returns Successful result with the flags, or the violations found.
 */
export function parsePermissionFlags(
  raw: unknown,
  path: string
): Result<PermissionFlags, readonly DomainError[]> {
  if (!isRecord(raw)) {
    return err([domainError(path, GENERAL_CONSTANTS.JWT.ERRORS.PERMISSION_FLAGS_MUST_BE_BOOLEANS)]);
  }

  const errors: DomainError[] = [];

  for (const flag of ['create', 'update', 'delete', 'view'] as const) {
    const value = raw[flag];
    if (value !== undefined && value !== null && !isBoolean(value)) {
      errors.push(domainError(`${path}.${flag}`, GENERAL_CONSTANTS.JWT.ERRORS.PERMISSION_FLAGS_MUST_BE_BOOLEANS));
    }
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok({
    create: raw['create'] === true,
    update: raw['update'] === true,
    delete: raw['delete'] === true,
    view: raw['view'] === true
  });
}
