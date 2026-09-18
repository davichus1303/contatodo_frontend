import { DomainError, domainError } from '../../domain/errors/domain-error';
import { createModule, Module } from '../../domain/models/module.model';
import { err, ok, Result } from '../../domain/result';

/**
 * Maps a raw modules collection payload to validated domain modules.
 *
 * The payload must be an array; every element goes through
 * {@link createModule}. Fail-fast for catalogs: if any element violates the
 * domain contract, none of them is delivered and every violation is returned
 * with its collection index for context.
 *
 * @param raw Raw `data` payload, typically the API response body.
 * @returns Successful result with the modules, or every violation found.
 */
export function mapModules(raw: unknown): Result<Module[], readonly DomainError[]> {
  if (!Array.isArray(raw)) {
    return err([domainError('modules', 'Modules payload must be an array.')]);
  }

  const modules: Module[] = [];
  const errors: DomainError[] = [];

  raw.forEach((item, index) => {
    const mapped = createModule(item);

    if (mapped.ok) {
      modules.push(mapped.value);
      return;
    }

    errors.push(
      ...mapped.error.map((error) => domainError(`modules[${index}].${error.field}`, error.message))
    );
  });

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(modules);
}
