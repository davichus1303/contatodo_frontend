import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpPort, HttpPortOptions } from '../../application/ports/http.port';

/**
 * HTTP adapter implementing {@link HttpPort} on top of Angular `HttpClient`.
 *
 * This is the only place (beside interceptors) allowed to import `HttpClient`.
 */
@Injectable({ providedIn: 'root' })
export class HttpAdapter implements HttpPort {
  private readonly http = inject(HttpClient);

  /** @inheritdoc */
  get<T>(url: string, options?: HttpPortOptions): Observable<T> {
    return this.http.get<T>(url, this.toHttpOptions(options));
  }

  /** @inheritdoc */
  post<T>(url: string, body: unknown, options?: HttpPortOptions): Observable<T> {
    return this.http.post<T>(url, body, this.toHttpOptions(options));
  }

  /** @inheritdoc */
  put<T>(url: string, body: unknown, options?: HttpPortOptions): Observable<T> {
    return this.http.put<T>(url, body, this.toHttpOptions(options));
  }

  /** @inheritdoc */
  delete<T>(url: string, options?: HttpPortOptions): Observable<T> {
    return this.http.delete<T>(url, this.toHttpOptions(options));
  }

  /**
   * Maps port options to Angular HTTP options.
   *
   * @param options Port-level options.
   * @returns Options object accepted by `HttpClient` methods.
   */
  private toHttpOptions(options?: HttpPortOptions): { headers?: Record<string, string> } {
    return options?.headers ? { headers: options.headers } : {};
  }
}
