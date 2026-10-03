import { DomainError, domainError } from '../domain/errors/domain-error';
import { err, ok, Result } from '../domain/result';
import { PermissionFlags, parsePermissionFlags } from '../domain/validation/permission-flags.rule';
import { isNonEmptyString, isRecord, optionalString } from '../domain/validation/primitive.rules';
import { GENERAL_CONSTANTS } from '@shared/constants/general.constants';

export type { PermissionFlags };

/**
 * Action keys accepted by permission checks.
 */
export type PermissionAction = keyof PermissionFlags;

/**
 * Permission entry carried by the JWT for a single module.
 */
export interface JwtPermission {
  readonly moduleOid: string;
  readonly permissions: PermissionFlags;
}

/**
 * Claims relevant to authorization extracted from the JWT payload.
 *
 * Optional fields are `undefined` when the token does not carry them (for
 * example a public registration without a role).
 */
export interface JwtClaims {
  readonly subject: string;
  readonly roleId?: string;
  readonly roleName?: string;
  readonly role?: string;
  readonly permissions: readonly JwtPermission[];
  readonly companyOid?: string;
}

/**
 * Builds validated {@link JwtClaims} from a raw JWT payload.
 *
 * Following the domain model convention, load-bearing invariants are
 * enforced: the payload must be an object with a non-empty `sub` subject,
 * and every `permissionOfRole` entry must reference a module and carry the four
 * permission flags, where an unset flag is read as not granted. Text fields are
 * trimmed and optional claims collapse to `undefined` when absent or blank.
 *
 * @param raw Raw JWT payload.
 * @returns Successful result with the claims, or every violation found.
 */
export function parseJwtClaims(raw: unknown): Result<JwtClaims, readonly DomainError[]> {
  if (!isRecord(raw)) {
    return err([domainError('jwt', GENERAL_CONSTANTS.JWT.ERRORS.PAYLOAD_NOT_OBJECT)]);
  }

  const errors: DomainError[] = [];

  if (!isNonEmptyString(raw['sub'])) {
    errors.push(domainError('sub', GENERAL_CONSTANTS.JWT.ERRORS.SUBJECT_NOT_NON_EMPTY_STRING));
  }

  for (const field of ['roleId', 'roleName', 'role', 'companyOid'] as const) {
    const value = raw[field];
    if (value !== undefined && value !== null && typeof value !== 'string') {
      errors.push(domainError(field, GENERAL_CONSTANTS.JWT.ERRORS.FIELD_NOT_STRING.replace('{field}', field)));
    }
  }

  const permissions: JwtPermission[] = [];
  const rawPermissions = raw['permissionOfRole'];
  if (rawPermissions !== undefined && rawPermissions !== null) {
    if (!Array.isArray(rawPermissions)) {
      errors.push(domainError('permissionOfRole', GENERAL_CONSTANTS.JWT.ERRORS.PERMISSION_OF_ROLE_NOT_ARRAY));
    } else {
      rawPermissions.forEach((permission, index) => {
        if (!isRecord(permission) || !isNonEmptyString(permission['moduleOid'])) {
          errors.push(domainError(`permissionOfRole[${index}]`, GENERAL_CONSTANTS.JWT.ERRORS.PERMISSION_MODULE_REQUIRED));
          return;
        }
        const flags = parsePermissionFlags(permission['permissions'], `permissionOfRole[${index}].permissions`);
        if (!flags.ok) {
          errors.push(...flags.error);
          return;
        }

        permissions.push({
          moduleOid: (permission['moduleOid'] as string).trim(),
          permissions: flags.value
        });
      });
    }
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok({
    subject: (raw['sub'] as string).trim(),
    roleId: optionalString(raw['roleId']),
    roleName: optionalString(raw['roleName']),
    role: optionalString(raw['role']),
    permissions,
    companyOid: optionalString(raw['companyOid'])
  });
}