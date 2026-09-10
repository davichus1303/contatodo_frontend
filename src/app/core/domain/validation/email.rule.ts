import { isNonEmptyString } from './primitive.rules';

/**
 * Email pattern kept in parity with Angular `Validators.email` (WHATWG
 * HTML5 algorithm plus 254/64 length limits) so that domain checks and form
 * UX accept exactly the same values.
 */
const EMAIL_REGEXP =
  /^(?=.{1,254}$)(?=.{1,64}@)[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/;

/**
 * Checks whether a value is a syntactically valid email address.
 *
 * @param value Value under test.
 * @returns True when the value is a non-empty string matching the email pattern.
 */
export function isValidEmail(value: unknown): value is string {
  return isNonEmptyString(value) && EMAIL_REGEXP.test(value);
}
