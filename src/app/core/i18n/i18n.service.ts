import { Injectable, inject } from '@angular/core';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HTTP_PORT } from '../application/ports/http.port';

/**
 * Service for internationalization (i18n) translations.
 */
@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private readonly http = inject(HTTP_PORT);

  private translations: Record<string, unknown> = {};
  private currentLang = 'es';

  constructor() {
    this.loadTranslations(this.currentLang);
  }

  /**
   * Loads translations for the specified language.
   *
   * Missing translation files resolve to an empty dictionary so that
   * {@link translate} falls back to raw keys instead of failing.
   *
   * @param lang Language code (e.g., 'es', 'en').
   */
  loadTranslations(lang: string): void {
    this.http.get<Record<string, unknown>>(`/assets/i18n/${lang}.json`).pipe(
      catchError(() => of<Record<string, unknown>>({}))
    ).subscribe((data: Record<string, unknown>) => {
      this.translations = data;
    });
  }

  /**
   * Gets a translation by key.
   *
   * @param key Translation key (e.g., 'MODULES_NAVIGATION.MODULES').
   * @returns Translated string or the key itself when not found.
   */
  translate(key: string): string {
    const keys = key.split('.');
    let value: unknown = this.translations;

    for (const currentKey of keys) {
      if (typeof value === 'object' && value !== null && currentKey in value) {
        value = (value as Record<string, unknown>)[currentKey];
      } else {
        return key;
      }
    }

    return typeof value === 'string' ? value : key;
  }
}
