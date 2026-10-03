import { DomainError, domainError } from '../errors/domain-error';
import { err, ok, Result } from '../result';
import { isFiniteNumber, isNonEmptyString, isRecord, optionalString } from '../validation/primitive.rules';
import { SALES_CONSTANTS } from '@shared/constants/sales.constants';

/**
 * Sale entity of the sales domain.
 */
export interface Sale {
  readonly id: string;
  readonly saleNumber: number;
  readonly productOid: string;
  readonly productName?: string;
  readonly userOid: string;
  readonly quantity: number;
  readonly totalCost: number;
  readonly originalTotalPrice: number;
  readonly totalSalePrice: number;
  readonly saleDate: string;
  readonly notes: string;
  readonly createdDate: string;
  readonly updatedDate: string;
}

/**
 * Builds a validated {@link Sale} from raw transport data.
 *
 * Load-bearing invariants are enforced: the payload must be an object, the
 * identity/date fields must be non-empty strings and every monetary/quantity
 * field must be a finite number. The owning user comes from the backend's
 * `byUserOid` field, falling back to `userOid` for tolerance. The optional
 * `productName` collapses to `undefined` when absent and `notes` defaults to
 * an empty string so partial payloads never leak invalid values.
 *
 * @param raw Raw payload, typically an API list item.
 * @returns Successful result with the sale, or every violation found.
 */
export function createSale(raw: unknown): Result<Sale, readonly DomainError[]> {
  if (!isRecord(raw)) {
    return err([domainError('sale', 'Sale payload must be an object.')]);
  }

  const errors: DomainError[] = [];

  const rawUserOid =
    raw[SALES_CONSTANTS.MODEL.FIELDS.BY_USER_OID] ?? raw[SALES_CONSTANTS.MODEL.FIELDS.USER_OID];

  for (const field of ['id', 'productOid', 'saleDate', 'createdDate', 'updatedDate'] as const) {
    if (!isNonEmptyString(raw[field])) {
      errors.push(domainError(field, `Sale ${field} must be a non-empty string.`));
    }
  }

  if (!isNonEmptyString(rawUserOid)) {
    errors.push(
      domainError(SALES_CONSTANTS.MODEL.FIELDS.USER_OID, SALES_CONSTANTS.MODEL.ERRORS.USER_OID_MUST_BE_NON_EMPTY_STRING)
    );
  }

  const numericFields = [
    'saleNumber',
    'quantity',
    'totalCost',
    'originalTotalPrice',
    'totalSalePrice'
  ] as const;
  for (const field of numericFields) {
    if (!isFiniteNumber(raw[field])) {
      errors.push(domainError(field, `Sale ${field} must be a finite number.`));
    }
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok({
    id: (raw['id'] as string).trim(),
    saleNumber: raw['saleNumber'] as number,
    productOid: (raw['productOid'] as string).trim(),
    productName: optionalString(raw['productName']),
    userOid: (rawUserOid as string).trim(),
    quantity: raw['quantity'] as number,
    totalCost: raw['totalCost'] as number,
    originalTotalPrice: raw['originalTotalPrice'] as number,
    totalSalePrice: raw['totalSalePrice'] as number,
    saleDate: (raw['saleDate'] as string).trim(),
    notes: optionalString(raw['notes']) ?? '',
    createdDate: (raw['createdDate'] as string).trim(),
    updatedDate: (raw['updatedDate'] as string).trim()
  });
}