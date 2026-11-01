import { Provider } from '@angular/core';
import { STORAGE_PORT } from '@core/application/ports/storage.port';

/**
 * In-memory storage port for component specs.
 *
 * <p>Services such as {@code CompanySelectionService} and {@code AuthService}
 * depend on the storage port even when a spec replaces the application
 * service itself. Providing this stub keeps the test injector free of the real
 * browser adapter and avoids the missing-provider error.</p>
 */
export const STORAGE_PORT_STUB_PROVIDER: Provider = {
  provide: STORAGE_PORT,
  useValue: {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined
  }
};
