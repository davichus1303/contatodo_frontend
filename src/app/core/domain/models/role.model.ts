import { DomainError, domainError } from '../errors/domain-error';
import { err, ok, Result } from '../result';
import { isBoolean, isNonEmptyString, isRecord } from '../validation/primitive.rules';

/**
 * Permission grants a role holds over a single module.
 */
export interface RolePermission {
  readonly moduleOid: string;
  readonly permissions: {
    readonly create: boolean;
    readonly update: boolean;
    readonly delete: boolean;
    readonly view: boolean;
  };
}

/**
 * Role entity: named set of per-module permissions.
 */
export interface Role {
  readonly id: string;
  readonly name: string;
  readonly permissions: RolePermission[];
  readonly isDeleted: boolean;
  readonly isActive: boolean;
  readonly createdDate: string;
  readonly updatedDate: string;
  readonly createdBy: string;
}

/**
 * Builds a validated {@link Role} from raw transport data.
 *
 * Load-bearing invariants are enforced: the payload must be an object,
 * `id`/`name` must be non-empty strings and `permissions` must be an array
 * whose entries carry a module reference and a boolean permission flags
 * record. Text fields are normalized (trimmed) and the status flags are
 * coerced to booleans, defaulting to `false`.
 *
 * @param raw Raw payload, typically an API list item.
 * @returns Successful result with the role, or every violation found.
 */
export function createRole(raw: unknown): Result<Role, readonly DomainError[]> {
  if (!isRecord(raw)) {
    return err([domainError('role', 'Role payload must be an object.')]);
  }

  const errors: DomainError[] = [];

  if (!isNonEmptyString(raw['id'])) {
    errors.push(domainError('id', 'Role id must be a non-empty string.'));
  }
  if (!isNonEmptyString(raw['name'])) {
    errors.push(domainError('name', 'Role name must be a non-empty string.'));
  }
  for (const field of ['createdDate', 'updatedDate', 'createdBy'] as const) {
    if (!isNonEmptyString(raw[field])) {
      errors.push(domainError(field, `Role ${field} must be a non-empty string.`));
    }
  }
  for (const field of ['isDeleted', 'isActive'] as const) {
    const value = raw[field];
    if (value !== undefined && value !== null && !isBoolean(value)) {
      errors.push(domainError(field, `Role ${field} must be a boolean when present.`));
    }
  }

  const permissions: RolePermission[] = [];
  if (!Array.isArray(raw['permissions'])) {
    errors.push(domainError('permissions', 'Role permissions must be an array.'));
  } else {
    raw['permissions'].forEach((permission, index) => {
      if (!isRecord(permission) || !isNonEmptyString(permission['moduleOid'])) {
        errors.push(domainError(`permissions[${index}]`, 'Permission must reference a module.'));
        return;
      }
      const flags = permission['permissions'];
      if (!isRecord(flags) ||
          !isBoolean(flags['create']) ||
          !isBoolean(flags['update']) ||
          !isBoolean(flags['delete']) ||
          !isBoolean(flags['view'])) {
        errors.push(domainError(`permissions[${index}].permissions`, 'Permission flags must be booleans.'));
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

  if (errors.length > 0) {
    return err(errors);
  }

  return ok({
    id: (raw['id'] as string).trim(),
    name: (raw['name'] as string).trim(),
    permissions,
    isDeleted: raw['isDeleted'] === true,
    isActive: raw['isActive'] === true,
    createdDate: (raw['createdDate'] as string).trim(),
    updatedDate: (raw['updatedDate'] as string).trim(),
    createdBy: (raw['createdBy'] as string).trim()
  });
}
