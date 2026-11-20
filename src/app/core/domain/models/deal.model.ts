import { DomainError, domainError } from '../errors/domain-error';
import { err, ok, Result } from '../result';
import { isBoolean, isFiniteNumber, isNonEmptyString, isRecord, optionalString } from '../validation/primitive.rules';
import { DEALS_CONSTANTS } from '@shared/constants/deals.constants';

/**
 * Deal entity representing a product offer for a company.
 */
export interface Deal {
  readonly id: string;
  readonly productOid: string;
  readonly unitOfMeasureOid: string;
  readonly quantity: number;
  readonly price: number;
  readonly companyOid: string;
  readonly createdDate?: string;
  readonly updateDate?: string;
  readonly isActive: boolean;
  readonly isDelete: boolean;
}

/**
 * Builds a validated {@link Deal} from raw transport data.
 *
 * @param raw Raw payload, typically an API response item.
 * @returns Successful result with the deal, or every violation found.
 */
export function createDeal(raw: unknown): Result<Deal, readonly DomainError[]> {
  if (!isRecord(raw)) {
    return err([domainError('deal', DEALS_CONSTANTS.MODEL.ERRORS.PAYLOAD_MUST_BE_OBJECT)]);
  }

  const errors: DomainError[] = [];

  if (!isNonEmptyString(raw['id'])) {
    errors.push(domainError('id', DEALS_CONSTANTS.MODEL.ERRORS.ID_REQUIRED));
  }
  if (!isNonEmptyString(raw['productOid'])) {
    errors.push(domainError('productOid', DEALS_CONSTANTS.MODEL.ERRORS.PRODUCT_OID_REQUIRED));
  }
  if (!isNonEmptyString(raw['unitOfMeasureOid'])) {
    errors.push(domainError('unitOfMeasureOid', DEALS_CONSTANTS.MODEL.ERRORS.UNIT_OF_MEASURE_OID_REQUIRED));
  }
  if (!isNonEmptyString(raw['companyOid'])) {
    errors.push(domainError('companyOid', DEALS_CONSTANTS.MODEL.ERRORS.COMPANY_OID_REQUIRED));
  }

  if (!isFiniteNumber(raw['quantity'])) {
    errors.push(domainError('quantity', DEALS_CONSTANTS.MODEL.ERRORS.QUANTITY_MUST_BE_FINITE_NUMBER));
  }
  if (!isFiniteNumber(raw['price'])) {
    errors.push(domainError('price', DEALS_CONSTANTS.MODEL.ERRORS.PRICE_MUST_BE_FINITE_NUMBER));
  }

  for (const field of ['isActive', 'isDelete'] as const) {
    const value = raw[field];
    if (value !== undefined && value !== null && !isBoolean(value)) {
      const message = field === 'isActive'
        ? DEALS_CONSTANTS.MODEL.ERRORS.IS_ACTIVE_MUST_BE_BOOLEAN
        : DEALS_CONSTANTS.MODEL.ERRORS.IS_DELETE_MUST_BE_BOOLEAN;
      errors.push(domainError(field, message));
    }
  }

  if (errors.length > 0) {
    return err(errors);
  }

  return ok({
    id: (raw['id'] as string).trim(),
    productOid: (raw['productOid'] as string).trim(),
    unitOfMeasureOid: (raw['unitOfMeasureOid'] as string).trim(),
    companyOid: (raw['companyOid'] as string).trim(),
    quantity: raw['quantity'] as number,
    price: raw['price'] as number,
    createdDate: optionalString(raw['createdDate']),
    updateDate: optionalString(raw['updateDate']),
    isActive: raw['isActive'] === true,
    isDelete: raw['isDelete'] === true
  });
}
