import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HTTP_PORT } from '../ports/http.port';
import { ApiResponse } from '../ports/api-response.interface';
import { Acquisition, createAcquisition } from '../../domain/models/acquisition.model';
import { DomainError } from '../../domain/errors/domain-error';
import { Result } from '../../domain/result';
import { mapAcquisitions } from './acquisition.mapper';
import { CreateAcquisitionRequest } from '../dto/acquisition-request.dto';
import { ACQUISITIONS_URL } from '../../config/api-routes.constants';

/**
 * Use cases for acquisitions (create, list by optional date range).
 */
@Injectable({
  providedIn: 'root'
})
export class AcquisitionsService {
  private readonly http = inject(HTTP_PORT);
  private readonly apiUrl = ACQUISITIONS_URL;

  /**
   * Creates a new acquisition.
   *
   * @param request Acquisition creation request.
   * @returns Observable with API response containing the created acquisition.
   */
  createAcquisition(request: CreateAcquisitionRequest): Observable<ApiResponse<Acquisition>> {
    return this.http.post<ApiResponse<unknown>>(this.apiUrl, request).pipe(
      map((response) => this.withMappedData(response, createAcquisition(response.data)))
    );
  }

  /**
   * Retrieves acquisitions for the authenticated user.
   * By default, returns today's acquisitions.
   * Supports optional date range filtering.
   *
   * @param startDate Optional start date.
   * @param endDate Optional end date.
   * @returns Observable with API response containing acquisitions.
   */
  getAcquisitions(startDate?: Date, endDate?: Date): Observable<ApiResponse<Acquisition[]>> {
    const url =
      startDate && endDate
        ? `${this.apiUrl}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        : this.apiUrl;

    return this.http.get<ApiResponse<unknown>>(url).pipe(
      map((response) => this.withMappedData(response, mapAcquisitions(response.data)))
    );
  }

  /**
   * Replaces the raw transport `data` with its validated domain value.
   *
   * Fail-fast: a contract violation is rethrown through the observable error
   * channel, so callers never receive unvalidated transport data.
   *
   * @param response Raw API response.
   * @param mapped Result of mapping {@link ApiResponse.data}.
   * @returns API response whose `data` is the domain value.
   */
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
