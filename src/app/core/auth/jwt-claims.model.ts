import { DomainError, domainError } from '../domain/errors/domain-error';
import { err, ok, Result } from '../domain/result';
import { isBoolean, isNonEmptyString, isRecord, optionalString } from '../domain/validation/primitive.rules';

/**
 * Permission flags a role holds over a single module, as carried in the JWT.
 */
export interface PermissionFlags {
  readonly create: boolean;
  readonly update: boolean;
  readonly delete: boolean;
  readonly view: boolean;
}

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
 * and every `permissionOfRole` entry must reference a module and carry four
 * boolean flags. Text fields are trimmed and optional claims collapse to
 * `undefined` when absent or blank.
 *
 * @param raw Raw JWT payload.
 * @returns Successful result with the claims, or every violation found.
 */
export function parseJwtClaims(raw: unknown): Result<JwtClaims, readonly DomainError[]> {
  if (!isRecord(raw)) {
    return err([domainError('jwt', 'JWT payload must be an object.')]);
  }

  const errors: DomainError[] = [];

  if (!isNonEmptyString(raw['sub'])) {
    errors.push(domainError('sub', 'JWT subject must be a non-empty string.'));
  }

  for (const field of ['roleId', 'roleName', 'role', 'companyOid'] as const) {
    const value = raw[field];
    if (value !== undefined && value !== null && typeof value !== 'string') {
      errors.push(domainError(field, `JWT ${field} must be a string when present.`));
    }
  }

  const permissions: JwtPermission[] = [];
  const rawPermissions = raw['permissionOfRole'];
  if (rawPermissions !== undefined && rawPermissions !== null) {
    if (!Array.isArray(rawPermissions)) {
      errors.push(domainError('permissionOfRole', 'JWT permissionOfRole must be an array.'));
    } else {
      rawPermissions.forEach((permission, index) => {
        if (!isRecord(permission) || !isNonEmptyString(permission['moduleOid'])) {
          errors.push(domainError(`permissionOfRole[${index}]`, 'Permission must reference a module.'));
          return;
        }
        const flags = permission['permissions'];
        if (!isRecord(flags) ||
            !isBoolean(flags['create']) ||
            !isBoolean(flags['update']) ||
            !isBoolean(flags['delete']) ||
            !isBoolean(flags['view'])) {
          errors.push(domainError(`permissionOfRole[${index}].permissions`, 'Permission flags must be booleans.'));
          return;
        }

        permissions.push({
          moduleOid: (permission['moduleOid'] as string).trim(),
          permissions: {
            create: flags['create'] === true,
            update: flags['update'] === true,
            delete: flags['delete'] === true,
            view: flags['view'] === true
          }
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