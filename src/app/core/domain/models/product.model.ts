import { DomainError, domainError } from '../errors/domain-error';
import { err, ok, Result } from '../result';
import { isBoolean, isFiniteNumber, isNonEmptyString, isRecord, optionalString } from '../validation/primitive.rules';

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
  readonly urlPhoto?: string;
  readonly isActive: boolean;
  readonly createdDate: string;
  readonly updatedDate: string;
}

/**
 * Builds a validated {@link Product} from raw transport data.
 *
 * Load-bearing invariants are enforced: the payload must be an object, `id`
 * and `name` must be non-empty strings and the monetary/stock fields must be
 * finite numbers. Text fields are normalized (trimmed) and the status flag is
 * coerced to a boolean; the optional `urlPhoto` collapses to `undefined` when
 * absent.
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
    if (!isFiniteNumber(raw[field])) {
      errors.push(domainError(field, `Product ${field} must be a finite number.`));
    }
  }

  for (const field of ['description', 'code', 'createdDate', 'updatedDate', 'urlPhoto'] as const) {
    const value = raw[field];
    if (value !== undefined && value !== null && typeof value !== 'string') {
      errors.push(domainError(field, `Product ${field} must be a string when present.`));
    }
  }
  const isActive = raw['isActive'];
  if (isActive !== undefined && isActive !== null && !isBoolean(isActive)) {
    errors.push(domainError('isActive', 'Product isActive must be a boolean when present.'));
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok({
    id: (raw['id'] as string).trim(),
    name: (raw['name'] as string).trim(),
    description: optionalString(raw['description']) ?? '',
    stock: raw['stock'] as number,
    code: optionalString(raw['code']) ?? '',
    realCost: raw['realCost'] as number,
    unitRealCost: raw['unitRealCost'] as number,
    unitPublicCost: raw['unitPublicCost'] as number,
    urlPhoto: optionalString(raw['urlPhoto']),
    isActive: raw['isActive'] === true,
    createdDate: optionalString(raw['createdDate']) ?? '',
    updatedDate: optionalString(raw['updatedDate']) ?? ''
  });
}
