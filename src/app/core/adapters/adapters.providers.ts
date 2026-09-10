import { Provider } from '@angular/core';
import { HTTP_PORT } from '../application/ports/http.port';
import { STORAGE_PORT } from '../application/ports/storage.port';
import { HttpAdapter } from './http/http.adapter';
import { LocalStorageAdapter } from './storage/local-storage.adapter';

/**
 * Root providers wiring every outbound port to its concrete adapter.
 */
export const ADAPTER_PROVIDERS: Provider[] = [
  { provide: HTTP_PORT, useClass: HttpAdapter },
  { provide: STORAGE_PORT, useClass: LocalStorageAdapter }
];
