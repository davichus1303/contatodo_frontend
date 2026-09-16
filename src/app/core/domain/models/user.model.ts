import { DomainError, domainError } from '../errors/domain-error';
import { isValidEmail } from '../validation/email.rule';
import { err, ok, Result } from '../result';
import { isNonEmptyString, isRecord } from '../validation/primitive.rules';
import { Role } from './role.model';

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
  readonly createdDate: string;
  readonly updatedDate: string;
  readonly active: boolean;
  readonly role?: Role | null;
}

/**
 * Builds a validated {@link User} from raw transport data.
 *
 * Load-bearing invariants are enforced: the payload must be an object,
 * `id` must be a non-empty string and `email` must be a valid email address.
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

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(raw as unknown as User);
}
