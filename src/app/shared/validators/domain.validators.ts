import { AbstractControl, ValidationErrors } from '@angular/forms';
import { isValidEmail } from '@core/domain/validation/email.rule';
import { isNonEmptyString } from '@core/domain/validation/primitive.rules';

/**
 * Reactive-Forms adapter for the domain email rule.
 *
 * Produces the same `{ email: true }` error key as Angular's built-in
 * `Validators.email` while keeping the rule itself in the domain layer.
 * Empty values are not rejected here: requiredness is a separate concern.
 *
 * @returns Validator function usable in reactive forms.
 */
export function domainEmail(): (control: AbstractControl<unknown>) => ValidationErrors | null {
  return (control: AbstractControl<unknown>): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null;
    }
    return isValidEmail(value) ? null : { email: true };
  };
}

/**
 * Reactive-Forms adapter for the domain non-blank rule.
 *
 * Produces the legacy `{ whitespace: true }` error key. Values that are not
 * strings are left untouched so type errors do not shadow requiredness UX.
 *
 * @returns Validator function usable in reactive forms.
 */
export function nonBlank(): (control: AbstractControl<unknown>) => ValidationErrors | null {
  return (control: AbstractControl<unknown>): ValidationErrors | null => {
    const value = control.value;
    if (typeof value !== 'string') {
      return null;
    }
    return isNonEmptyString(value) ? null : { whitespace: true };
  };
}
