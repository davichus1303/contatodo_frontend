import { Injectable } from '@angular/core';
import { StoragePort } from '../../application/ports/storage.port';

/**
 * Storage adapter implementing {@link StoragePort} over `localStorage`.
 *
 * Every access is guarded so that server-side rendering never touches
 * browser-only APIs.
 */
@Injectable({ providedIn: 'root' })
export class LocalStorageAdapter implements StoragePort {
  /** @inheritdoc */
  getItem(key: string): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem(key);
  }

  /** @inheritdoc */
  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(key, value);
  }

  /** @inheritdoc */
  removeItem(key: string): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.removeItem(key);
  }
}
