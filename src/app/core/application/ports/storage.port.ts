import { InjectionToken } from '@angular/core';

/**
 * Port (outbound contract) for key/value persistence.
 *
 * Application services depend on this abstraction instead of touching
 * `localStorage` directly, which keeps SSR-safe behavior inside the adapter.
 */
export interface StoragePort {
  /**
   * Reads a value by key.
   *
   * @param key Storage key.
   * @returns Stored value or null when missing (or on non-browser platforms).
   */
  getItem(key: string): string | null;

  /**
   * Writes a value by key.
   *
   * @param key Storage key.
   * @param value Value to persist.
   */
  setItem(key: string, value: string): void;

  /**
   * Removes a value by key.
   *
   * @param key Storage key.
   */
  removeItem(key: string): void;
}

/**
 * DI token binding the {@link StoragePort} abstraction to its adapter.
 */
export const STORAGE_PORT = new InjectionToken<StoragePort>('STORAGE_PORT');
