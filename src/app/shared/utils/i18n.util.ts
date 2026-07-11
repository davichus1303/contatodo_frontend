import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Service for internationalization (i18n) translations.
 */
@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private translations: Record<string, unknown> = {};
  private currentLang = 'es';

  constructor(private http: HttpClient) {
    this.loadTranslations(this.currentLang);
  }

  /**
   * Loads translations for the specified language.
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
   * @returns Translated string or the key if not found.
   */
  translate(key: string): string {
    const keys = key.split('.');
    let value: unknown = this.translations;

    for (const k of keys) {
      if (typeof value === 'object' && value !== null && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }

    return typeof value === 'string' ? value : key;
  }
}
