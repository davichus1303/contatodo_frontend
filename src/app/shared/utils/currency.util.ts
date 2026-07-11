/**
 * Utility class for currency formatting.
 */
export class CurrencyUtil {
  /**
   * Formats a number as currency.
   *
   * @param value Number to format.
   * @param locale Locale for formatting (default: es-PE).
   * @param currency Currency code (default: PEN).
   * @returns Formatted currency string.
   */
  static formatCurrency(
    value: number,
    locale: string = 'es-PE',
    currency: string = 'PEN'
  ): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(value);
  }
}
