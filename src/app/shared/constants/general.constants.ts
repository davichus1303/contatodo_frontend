/**
 * General constants used across the application.
 */
export const GENERAL_CONSTANTS = {
  // Snackbar
  SNACKBAR: {
    CLOSE_BUTTON: 'Close',
    DURATION: 3000
  },
  // Currency
  CURRENCY: {
    LOCALE: 'es-PE',
    CURRENCY_CODE: 'PEN'
  },
  // Strings
  EMPTY: '',
  // Numbers
  NUMBERS: {
    ZERO: 0,
    ONE: 1
  },
  // JWT claims validation
  JWT: {
    ERRORS: {
      PAYLOAD_NOT_OBJECT: 'JWT payload must be an object.',
      SUBJECT_NOT_NON_EMPTY_STRING: 'JWT subject must be a non-empty string.',
      FIELD_NOT_STRING: 'JWT {field} must be a string when present.',
      PERMISSION_OF_ROLE_NOT_ARRAY: 'JWT permissionOfRole must be an array.',
      PERMISSION_MODULE_REQUIRED: 'Permission must reference a module.',
      PERMISSION_FLAGS_MUST_BE_BOOLEANS: 'Permission flags must be booleans.'
    }
  }
};
