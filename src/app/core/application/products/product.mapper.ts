import { DomainError, domainError } from '../../domain/errors/domain-error';
import { createProduct, Product } from '../../domain/models/product.model';
import { err, ok, Result } from '../../domain/result';

/**
 * Maps a raw products collection payload to validated domain products.
 *
 * The payload must be an array; every element goes through
 * {@link createProduct}. Fail-fast for catalogs: if any element violates the
 * domain contract, none of them is delivered and every violation is returned
 * with its collection index for context.
 *
 * @param raw Raw `data` payload, typically the API response body.
 * @returns Successful result with the products, or every violation found.
 */
export function mapProducts(raw: unknown): Result<Product[], readonly DomainError[]> {
  if (!Array.isArray(raw)) {
    return err([domainError('products', 'Products payload must be an array.')]);
  }

  const products: Product[] = [];
  const errors: DomainError[] = [];

  raw.forEach((item, index) => {
    const mapped = createProduct(item);

    if (mapped.ok) {
      products.push(mapped.value);
      return;
    }

    errors.push(
      ...mapped.error.map((error) => domainError(`products[${index}].${error.field}`, error.message))
    );
  });

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(products);
}
