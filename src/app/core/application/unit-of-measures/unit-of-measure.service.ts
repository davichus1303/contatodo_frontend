import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, shareReplay, tap, throwError } from 'rxjs';
import { HTTP_PORT } from '../ports/http.port';
import { ApiResponse } from '../ports/api-response.interface';
import { UnitOfMeasure, createUnitOfMeasure } from '../../domain/models/unit-of-measure.model';
import { DomainError } from '../../domain/errors/domain-error';
import { Result } from '../../domain/result';
import { mapUnitOfMeasures } from './unit-of-measure.mapper';
import { UNIT_OF_MEASURES_URL } from '../../config/api-routes.constants';
import { CreateUnitOfMeasureRequest, UpdateUnitOfMeasureRequest } from '../dto/unit-of-measure-request.dto';

/** Cache key used when the backend resolves the company from the session. */
const SESSION_COMPANY_CACHE_KEY = '__session__';

/**
 * Use cases for units of measure (list active, list all non-deleted,
 * create, update, soft delete).
 *
 * <p>The read lists are cached per company because the catalog is reference
 * data consumed by several modules. Each entry is shared while in flight, so
 * concurrent consumers trigger a single request. A failed read evicts its
 * entry and every mutation clears the affected entries, keeping the cache
 * from serving stale catalog data.</p>
 */
@Injectable({
  providedIn: 'root'
})
export class UnitOfMeasureService {
  private readonly http = inject(HTTP_PORT);
  private readonly apiUrl = UNIT_OF_MEASURES_URL;
  private readonly activeUnitsCache = new Map<string, Observable<ApiResponse<UnitOfMeasure[]>>>();
  private readonly historicalUnitsCache = new Map<string, Observable<ApiResponse<UnitOfMeasure[]>>>();

  /**
   * Retrieves all active and non-deleted units of measure for the selected company.
   */
  getUnitOfMeasures(companyOid?: string): Observable<ApiResponse<UnitOfMeasure[]>> {
    return this.getCached(this.activeUnitsCache, companyOid, () =>
      this.http.get<ApiResponse<unknown>>(this.apiUrl, this.companyOptions(companyOid))
    );
  }

  /**
   * Retrieves all non-deleted units of measure for administration and
   * historical name resolution.
   */
  getAllNotDeletedUnitOfMeasures(companyOid?: string): Observable<ApiResponse<UnitOfMeasure[]>> {
    return this.getCached(this.historicalUnitsCache, companyOid, () =>
      this.http.get<ApiResponse<unknown>>(`${this.apiUrl}/admin/all`, this.companyOptions(companyOid))
    );
  }

  /**
   * Creates a new unit of measure.
   */
  createUnitOfMeasure(payload: CreateUnitOfMeasureRequest): Observable<ApiResponse<UnitOfMeasure>> {
    return this.http.post<ApiResponse<unknown>>(this.apiUrl, payload).pipe(
      map((response) => this.withMappedData(response, createUnitOfMeasure(response.data))),
      tap(() => this.invalidateCache(payload.companyOid))
    );
  }

  /**
   * Updates an existing unit of measure.
   */
  updateUnitOfMeasure(id: string, payload: UpdateUnitOfMeasureRequest, companyOid?: string): Observable<ApiResponse<UnitOfMeasure>> {
    return this.http.put<ApiResponse<unknown>>(`${this.apiUrl}/${id}`, payload, this.companyOptions(companyOid)).pipe(
      map((response) => this.withMappedData(response, createUnitOfMeasure(response.data))),
      tap(() => this.invalidateCache(companyOid))
    );
  }

  /**
   * Soft-deletes a unit of measure.
   */
  deleteUnitOfMeasure(id: string, companyOid?: string): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`, this.companyOptions(companyOid)).pipe(
      tap(() => this.invalidateCache(companyOid))
    );
  }

  /**
   * Clears the cached catalog entries.
   *
   * <p>Passing a company only evicts that company; omitting it clears every
   * company, which is the safe choice when the company cannot be determined
   * (for example, a session-scoped mutation).</p>
   *
   * @param companyOid Company whose entries must be evicted, or undefined for all.
   */
  invalidateCache(companyOid?: string): void {
    if (!companyOid) {
      this.activeUnitsCache.clear();
      this.historicalUnitsCache.clear();
      return;
    }

    this.activeUnitsCache.delete(companyOid);
    this.historicalUnitsCache.delete(companyOid);
  }

  /**
   * Builds the optional company query parameter.
   *
   * @param companyOid Company identifier, or undefined for a session-scoped read.
   * @returns Request options with the company parameter when present.
   */
  private companyOptions(companyOid?: string): { params?: { companyOid: string } } {
    return companyOid ? { params: { companyOid } } : {};
  }

  /**
   * Returns a shared, mapped catalog read backed by the supplied cache.
   *
   * @param cache Per-company cache of catalog reads.
   * @param companyOid Company identifier, or undefined for a session-scoped read.
   * @param request Factory of the raw HTTP read.
   * @returns Shared API response with mapped domain units.
   */
  private getCached(
    cache: Map<string, Observable<ApiResponse<UnitOfMeasure[]>>>,
    companyOid: string | undefined,
    request: () => Observable<ApiResponse<unknown>>
  ): Observable<ApiResponse<UnitOfMeasure[]>> {
    const key = companyOid ?? SESSION_COMPANY_CACHE_KEY;
    const cached = cache.get(key);

    if (cached) {
      return cached;
    }

    const request$ = request().pipe(
      map((response) => this.withMappedData(response, mapUnitOfMeasures(response.data))),
      catchError((error: unknown) => {
        cache.delete(key);
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    cache.set(key, request$);
    return request$;
  }

  private withMappedData<T>(
    response: ApiResponse<unknown>,
    mapped: Result<T, readonly DomainError[]>
  ): ApiResponse<T> {
    if (!mapped.ok) {
      throw mapped.error;
    }

    return { ...response, data: mapped.value };
  }
}
