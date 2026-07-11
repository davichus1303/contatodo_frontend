import { authInterceptor } from './auth.interceptor';

export const httpInterceptorProviders = [
  { provide: 'HTTP_INTERCEPTORS', useValue: authInterceptor, multi: true }
];
