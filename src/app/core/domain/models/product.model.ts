import { DomainError, domainError } from '../errors/domain-error';
import { err, ok, Result } from '../result';
import { isFiniteNumber, isNonEmptyString, isRecord } from '../validation/primitive.rules';

/**
 * Maximum accepted length for a product name (mirrors backend constraint).
 */
export const PRODUCT_NAME_MAX_LENGTH = 100;

/**
 * Maximum accepted length for a product description (mirrors backend constraint).
 */
export const PRODUCT_DESCRIPTION_MAX_LENGTH = 500;

/**
 * Product entity of the catalog domain.
 */
export interface Product {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly stock: number;
  readonly code: string;
  readonly realCost: number;
  readonly unitRealCost: number;
  readonly unitPublicCost: number;
  readonly urlPhoto: string;
  readonly isActive: boolean;
  readonly createdDate: string;
  readonly updatedDate: string;
}

/**
 * Builds a validated {@link Product} from raw transport data.
 *
 * Load-bearing invariants are enforced: the payload must be an object, `id`
 * and `name` must be non-empty strings and every monetary/stock field, when
 * present, must be a finite number. All other fields flow through untouched
 * so that consumers observe exactly what the API sent.
 *
 * @param raw Raw payload, typically an API list item.
 * @returns Successful result with the product, or every violation found.
 */
export function createProduct(raw: unknown): Result<Product, readonly DomainError[]> {
  if (!isRecord(raw)) {
    return err([domainError('product', 'Product payload must be an object.')]);
  }

  const errors: DomainError[] = [];

  if (!isNonEmptyString(raw['id'])) {
    errors.push(domainError('id', 'Product id must be a non-empty string.'));
  }
  if (!isNonEmptyString(raw['name'])) {
    errors.push(domainError('name', 'Product name must be a non-empty string.'));
  }

  const numericFields = ['stock', 'realCost', 'unitRealCost', 'unitPublicCost'] as const;
  for (const field of numericFields) {
    const value = raw[field];
    if (value !== undefined && value !== null && !isFiniteNumber(value)) {
      errors.push(domainError(field, `Product ${field} must be a finite number when present.`));
    }
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok(raw as unknown as Product);
}
