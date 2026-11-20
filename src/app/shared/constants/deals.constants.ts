/**
 * Deals-related constants.
 */
export const DEALS_CONSTANTS = {
  MODEL: {
    ERRORS: {
      PAYLOAD_MUST_BE_OBJECT: 'Deal payload must be an object.',
      PAYLOAD_MUST_BE_ARRAY: 'Deals payload must be an array.',
      ID_REQUIRED: 'Deal id must be a non-empty string.',
      PRODUCT_OID_REQUIRED: 'Deal productOid must be a non-empty string.',
      UNIT_OF_MEASURE_OID_REQUIRED: 'Deal unitOfMeasureOid must be a non-empty string.',
      COMPANY_OID_REQUIRED: 'Deal companyOid must be a non-empty string.',
      QUANTITY_MUST_BE_FINITE_NUMBER: 'Deal quantity must be a finite number.',
      PRICE_MUST_BE_FINITE_NUMBER: 'Deal price must be a finite number.',
      IS_ACTIVE_MUST_BE_BOOLEAN: 'Deal isActive must be a boolean when present.',
      IS_DELETE_MUST_BE_BOOLEAN: 'Deal isDelete must be a boolean when present.'
    }
  }
};
