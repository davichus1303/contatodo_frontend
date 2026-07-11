/**
 * Utility class for date formatting.
 */
export class DateUtil {
  /**
   * Formats a date string to a readable format.
   *
   * @param dateString Date string to format.
   * @param locale Locale for formatting (default: es-PE).
   * @returns Formatted date string.
   */
  static formatDate(dateString: string, locale: string = 'es-PE'): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  /**
   * Formats a date string to a short date format.
   *
   * @param dateString Date string to format.
   * @param locale Locale for formatting (default: es-PE).
   * @returns Formatted date string.
   */
  static formatShortDate(dateString: string, locale: string = 'es-PE'): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }
}
