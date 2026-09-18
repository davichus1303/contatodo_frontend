import { DomainError, domainError } from '../../domain/errors/domain-error';
import { Company, createCompany } from '../../domain/models/company.model';
import { err, ok, Result } from '../../domain/result';

/**
 * Maps a raw companies collection payload to validated domain companies.
 *
 * The payload must be an array; every element goes through
 * {@link createCompany}. Fail-fast for catalogs: if any element violates the
 * domain contract, none of them is delivered and every violation is returned
 * with its collection index for context.
 *
 * @param raw Raw `data` payload, typically the API response body.
 * @returns Successful result with the companies, or every violation found.
 */
export function mapCompanies(raw: unknown): Result<Company[], readonly DomainError[]> {
  if (!Array.isArray(raw)) {
    return err([domainError('companies', 'Companies payload must be an array.')]);
  }

  const companies: Company[] = [];
  const errors: DomainError[] = [];

  raw.forEach((item, index) => {
    const mapped = createCompany(item);

    if (mapped.ok) {
      companies.push(mapped.value);
      return;
    }

    errors.push(
      ...mapped.error.map((error) => domainError(`companies[${index}].${error.field}`, error.message))
    );
  });

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(companies);
}
