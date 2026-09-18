import { DomainError, domainError } from '../errors/domain-error';
import { err, ok, Result } from '../result';
import { isNonEmptyString, isRecord } from '../validation/primitive.rules';

/**
 * Module entity: an application section the authenticated user can access.
 */
export interface Module {
  readonly id: string;
  readonly name: string;
  readonly link: string;
  readonly category?: string;
}

/**
 * Builds a validated {@link Module} from raw transport data.
 *
 * Load-bearing invariants are enforced: the payload must be an object and
 * `id`/`name`/`link` must be non-empty strings (a module without a link
 * cannot be navigated). Text fields are normalized (trimmed) and the optional
 * `category` collapses to `undefined` when absent or blank.
 *
 * @param raw Raw payload, typically an API list item.
 * @returns Successful result with the module, or every violation found.
 */
export function createModule(raw: unknown): Result<Module, readonly DomainError[]> {
  if (!isRecord(raw)) {
    return err([domainError('module', 'Module payload must be an object.')]);
  }

  const errors: DomainError[] = [];

  if (!isNonEmptyString(raw['id'])) {
    errors.push(domainError('id', 'Module id must be a non-empty string.'));
  }
  if (!isNonEmptyString(raw['name'])) {
    errors.push(domainError('name', 'Module name must be a non-empty string.'));
  }
  if (!isNonEmptyString(raw['link'])) {
    errors.push(domainError('link', 'Module link must be a non-empty string.'));
  }
  const category = raw['category'];
  if (category !== undefined && category !== null && typeof category !== 'string') {
    errors.push(domainError('category', 'Module category must be a string when present.'));
  }

  if (errors.length > 0) {
    return err(errors);
  }

  const trimmedCategory = typeof category === 'string' ? category.trim() : '';

  return ok({
    id: (raw['id'] as string).trim(),
    name: (raw['name'] as string).trim(),
    link: (raw['link'] as string).trim(),
    category: trimmedCategory.length > 0 ? trimmedCategory : undefined
  });
}
