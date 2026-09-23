import { DomainError, domainError } from '../../domain/errors/domain-error';
import { Sale, createSale } from '../../domain/models/sale.model';
import { err, ok, Result } from '../../domain/result';

/**
 * Maps a raw sales collection payload to validated domain sales.
 *
 * The payload must be an array; every element goes through
 * {@link createSale}. Fail-fast: if any element violates the domain contract,
 * none of them is delivered and every violation is returned with its
 * collection index for context.
 *
 * @param raw Raw `data` payload, typically the API response body.
 * @returns Successful result with the sales, or every violation found.
 */
export function mapSales(raw: unknown): Result<Sale[], readonly DomainError[]> {
  if (!Array.isArray(raw)) {
    return err([domainError('sales', 'Sales payload must be an array.')]);
  }

  const sales: Sale[] = [];
  const errors: DomainError[] = [];

  raw.forEach((item, index) => {
    const mapped = createSale(item);

    if (mapped.ok) {
      sales.push(mapped.value);
      return;
    }

    errors.push(...mapped.error.map((error) => domainError(`sales[${index}].${error.field}`, error.message)));
  });

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(sales);
}