import { DomainError, domainError } from '../../domain/errors/domain-error';
import { createRole, Role } from '../../domain/models/role.model';
import { err, ok, Result } from '../../domain/result';

/**
 * Maps a raw roles collection payload to validated domain roles.
 *
 * The payload must be an array; every element goes through
 * {@link createRole}. Fail-fast for catalogs: if any element violates the
 * domain contract, none of them is delivered and every violation is returned
 * with its collection index for context.
 *
 * @param raw Raw `data` payload, typically the API response body.
 * @returns Successful result with the roles, or every violation found.
 */
export function mapRoles(raw: unknown): Result<Role[], readonly DomainError[]> {
  if (!Array.isArray(raw)) {
    return err([domainError('roles', 'Roles payload must be an array.')]);
  }

  const roles: Role[] = [];
  const errors: DomainError[] = [];

  raw.forEach((item, index) => {
    const mapped = createRole(item);

    if (mapped.ok) {
      roles.push(mapped.value);
      return;
    }

    errors.push(
      ...mapped.error.map((error) => domainError(`roles[${index}].${error.field}`, error.message))
    );
  });

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(roles);
}
