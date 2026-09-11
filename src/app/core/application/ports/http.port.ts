import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from './api-response.interface';

/**
 * Options accepted by every {@link HttpPort} operation.
 */
export interface HttpPortOptions {
  /**
   * Additional HTTP headers sent with the request.
   */
  readonly headers?: Record<string, string>;
}

/**
 * Port (outbound contract) for HTTP communication.
 *
 * Application services depend on this abstraction instead of Angular's
 * `HttpClient` so that transport details remain inside adapters.
 */
export interface HttpPort {
  /**
   * Performs a GET request.
   *
   * @param url Absolute or relative target URL.
   * @param options Optional request options.
   * @returns Observable with the deserialized response body.
   */
  get<T>(url: string, options?: HttpPortOptions): Observable<T>;

  /**
   * Performs a POST request.
   *
   * @param url Absolute or relative target URL.
   * @param body Request payload.
   * @param options Optional request options.
   * @returns Observable with the deserialized response body.
   */
  post<T>(url: string, body: unknown, options?: HttpPortOptions): Observable<T>;

  /**
   * Performs a PUT request.
   *
   * @param url Absolute or relative target URL.
   * @param body Request payload.
   * @param options Optional request options.
   * @returns Observable with the deserialized response body.
   */
  put<T>(url: string, body: unknown, options?: HttpPortOptions): Observable<T>;

  /**
   * Performs a DELETE request.
   *
   * @param url Absolute or relative target URL.
   * @param options Optional request options.
   * @returns Observable with the deserialized response body.
   */
  delete<T>(url: string, options?: HttpPortOptions): Observable<T>;
}

/**
 * Convenience alias for API responses transported through {@link HttpPort}.
 */
export type ApiCall<T> = Observable<ApiResponse<T>>;

/**
 * DI token binding the {@link HttpPort} abstraction to its adapter.
 */
export const HTTP_PORT = new InjectionToken<HttpPort>('HTTP_PORT');
