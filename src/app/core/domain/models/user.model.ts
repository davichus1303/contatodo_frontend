import { DomainError, domainError } from '../errors/domain-error';
import { isValidEmail } from '../validation/email.rule';
import { err, ok, Result } from '../result';
import { isBoolean, isNonEmptyString, isRecord, optionalString } from '../validation/primitive.rules';
import { createRole, Role } from './role.model';

/**
 * Authenticated user information stored with the session.
 *
 * When a user is listed in the users catalog the backend also resolves its
 * related {@link Role}; the login response leaves it undefined.
 */
export interface User {
  readonly id: string;
  readonly userName: string;
  readonly email: string;
  readonly name: string;
  readonly phoneNumber?: string | null;
  readonly createdDate: string;
  readonly updatedDate: string;
  readonly active: boolean;
  readonly role?: Role | null;
}

/**
 * Builds a validated {@link User} from raw transport data.
 *
 * Load-bearing invariants are enforced: the payload must be an object,
 * `id`/`userName`/`name` must be non-empty strings and `email` must be a
 * valid email address. Text fields are normalized (trimmed), the optional
 * `phoneNumber` collapses to `undefined` when absent and the status flag is
 * coerced to a boolean. An embedded role, when present, is itself validated.
 *
 * @param raw Raw payload, typically the `user` field of the login response.
 * @returns Successful result with the user, or every violation found.
 */
export function createUser(raw: unknown): Result<User, readonly DomainError[]> {
  if (!isRecord(raw)) {
    return err([domainError('user', 'User payload must be an object.')]);
  }

  const errors: DomainError[] = [];

  if (!isNonEmptyString(raw['id'])) {
    errors.push(domainError('id', 'User id must be a non-empty string.'));
  }
  if (!isValidEmail(raw['email'])) {
    errors.push(domainError('email', 'User email must be a valid email address.'));
  }
  if (!isNonEmptyString(raw['userName'])) {
    errors.push(domainError('userName', 'User userName must be a non-empty string.'));
  }
  if (!isNonEmptyString(raw['name'])) {
    errors.push(domainError('name', 'User name must be a non-empty string.'));
  }
  for (const field of ['createdDate', 'updatedDate', 'phoneNumber'] as const) {
    const value = raw[field];
    if (value !== undefined && value !== null && typeof value !== 'string') {
      errors.push(domainError(field, `User ${field} must be a string when present.`));
    }
  }
  const active = raw['active'];
  if (active !== undefined && active !== null && !isBoolean(active)) {
    errors.push(domainError('active', 'User active must be a boolean when present.'));
  }

  let role: Role | null | undefined;
  const rawRole = raw['role'];
  if (rawRole === undefined) {
    role = undefined;
  } else if (rawRole === null) {
    role = null;
  } else {
    const mappedRole = createRole(rawRole);
    if (mappedRole.ok) {
      role = mappedRole.value;
    } else {
      errors.push(...mappedRole.error.map((error) => domainError(`role.${error.field}`, error.message)));
    }
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok({
    id: (raw['id'] as string).trim(),
    userName: (raw['userName'] as string).trim(),
    email: (raw['email'] as string).trim(),
    name: (raw['name'] as string).trim(),
    phoneNumber: optionalString(raw['phoneNumber']),
    createdDate: optionalString(raw['createdDate']) ?? '',
    updatedDate: optionalString(raw['updatedDate']) ?? '',
    active: raw['active'] === true,
    role
  });
}
