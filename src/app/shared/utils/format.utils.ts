import { GENERAL_CONSTANTS } from '@shared/constants/general.constants';

/**
 * Formats a number as currency using the project locale and currency code.
 *
 * @param value Number to format.
 * @returns Formatted currency string.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(
    GENERAL_CONSTANTS.CURRENCY.LOCALE,
    {
      style: 'currency',
      currency: GENERAL_CONSTANTS.CURRENCY.CURRENCY_CODE
    }
  ).format(value);
}

/**
 * Formats a date as a YYYY-MM-DD string.
 *
 * @param date Date to format.
 * @returns Formatted date string.
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
