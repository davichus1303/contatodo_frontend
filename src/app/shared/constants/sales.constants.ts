/**
 * Sales-related constants.
 */
export const SALES_CONSTANTS = {
  MESSAGES: {
    SALE_CREATED_SUCCESSFULLY: 'Sale created successfully',
    ERROR_CREATING_SALE: 'Error creating sale',
    ERROR_LOADING_PRODUCTS: 'Error loading products',
    ERROR_LOADING_COMPANIES: 'Error loading companies'
  },
  // Sale domain model invariants backed by the transport payload contract.
  // The backend reports the owning user under `byUserOid`, tolerating the
  // legacy `userOid` alias on reads.
  MODEL: {
    FIELDS: {
      BY_USER_OID: 'byUserOid',
      USER_OID: 'userOid'
    },
    ERRORS: {
      USER_OID_MUST_BE_NON_EMPTY_STRING: 'Sale userOid must be a non-empty string.'
    }
  }
};
