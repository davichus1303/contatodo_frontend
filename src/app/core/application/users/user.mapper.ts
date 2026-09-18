import { DomainError, domainError } from '../../domain/errors/domain-error';
import { createUser, User } from '../../domain/models/user.model';
import { err, ok, Result } from '../../domain/result';

/**
 * Maps a raw users collection payload to validated domain users.
 *
 * The payload must be an array; every element goes through
 * {@link createUser}. Fail-fast for catalogs: if any element violates the
 * domain contract, none of them is delivered and every violation is returned
 * with its collection index for context.
 *
 * @param raw Raw `data` payload, typically the API response body.
 * @returns Successful result with the users, or every violation found.
 */
export function mapUsers(raw: unknown): Result<User[], readonly DomainError[]> {
  if (!Array.isArray(raw)) {
    return err([domainError('users', 'Users payload must be an array.')]);
  }

  const users: User[] = [];
  const errors: DomainError[] = [];

  raw.forEach((item, index) => {
    const mapped = createUser(item);

    if (mapped.ok) {
      users.push(mapped.value);
      return;
    }

    errors.push(
      ...mapped.error.map((error) => domainError(`users[${index}].${error.field}`, error.message))
    );
  });

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(users);
}
