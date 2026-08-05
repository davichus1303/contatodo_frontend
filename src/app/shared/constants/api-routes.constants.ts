/**
 * This file contains constants for API routes used in the application.
 * The constants are constructed based on environment variables or default values.
 */
const getEnvValue = (key: string, fallback: string): string => {
  const envFromWindow =
    typeof window !== 'undefined' && (window as any)['env']?.[key];
  if (envFromWindow) {
    return envFromWindow;
  }

  const envFromProcess =
    typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.[key];
  if (envFromProcess) {
    return envFromProcess;
  }

  return fallback;
};

export const BASE_URL = getEnvValue('BASE_URL', 'http://localhost:8080');
export const SLASH = getEnvValue('SLASH', '/');
export const PRODUCTS = getEnvValue('PRODUCTS', 'products');
export const SALES = getEnvValue('SALES', 'sales');
export const ACQUISITIONS = getEnvValue('ACQUISITIONS', 'acquisitions');
export const ACQUISITION_TYPES = getEnvValue('ACQUISITION_TYPES', 'acquisition-types');

export const PRODUCTS_URL = `${BASE_URL}${SLASH}${PRODUCTS}`;
export const SALES_URL = `${BASE_URL}${SLASH}${SALES}`;
export const ACQUISITIONS_URL = `${BASE_URL}${SLASH}${ACQUISITIONS}`;
export const ACQUISITION_TYPES_URL = `${BASE_URL}${SLASH}${ACQUISITION_TYPES}`;
