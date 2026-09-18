import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HTTP_PORT } from '../ports/http.port';
import { ApiResponse } from '../ports/api-response.interface';
import { AcquisitionType, createAcquisitionType } from '../../domain/models/acquisition-type.model';
import { DomainError } from '../../domain/errors/domain-error';
import { Result } from '../../domain/result';
import { mapAcquisitionTypes } from './acquisition-type.mapper';
import { ACQUISITION_TYPES_URL } from '../../config/api-routes.constants';
import { CreateAcquisitionTypeRequest, UpdateAcquisitionTypeRequest } from '../dto/acquisition-type-request.dto';

/**
 * Use cases for acquisition types (list active, list all non-deleted,
 * create, update, soft delete).
 */
@Injectable({
  providedIn: 'root'
})
export class AcquisitionTypeService {
  private readonly http = inject(HTTP_PORT);
  private readonly apiUrl = ACQUISITION_TYPES_URL;

  /**
   * Retrieves all active and non-deleted acquisition types.
   *
   * @returns Observable with API response containing acquisition types.
   */
  getAcquisitionTypes(): Observable<ApiResponse<AcquisitionType[]>> {
    return this.http.get<ApiResponse<unknown>>(this.apiUrl).pipe(
      map((response) => this.withMappedData(response, mapAcquisitionTypes(response.data)))
    );
  }

  /**
   * Retrieves all non-deleted acquisition types (both active and inactive) for administration.
   *
   * @returns Observable with API response containing acquisition types.
   */
  getAllNotDeletedAcquisitionTypes(): Observable<ApiResponse<AcquisitionType[]>> {
    return this.http.get<ApiResponse<unknown>>(`${this.apiUrl}/admin/all`).pipe(
      map((response) => this.withMappedData(response, mapAcquisitionTypes(response.data)))
    );
  }

  /**
   * Creates a new acquisition type.
   *
   * @param payload Creation request data.
   * @returns Observable with API response containing the created acquisition type.
   */
  createAcquisitionType(payload: CreateAcquisitionTypeRequest): Observable<ApiResponse<AcquisitionType>> {
    return this.http.post<ApiResponse<unknown>>(this.apiUrl, payload).pipe(
      map((response) => this.withMappedData(response, createAcquisitionType(response.data)))
    );
  }

  /**
   * Updates an existing acquisition type.
   *
   * @param id Acquisition type ID.
   * @param payload Update request data.
   * @returns Observable with API response containing the updated acquisition type.
   */
  updateAcquisitionType(
    id: string,
    payload: UpdateAcquisitionTypeRequest
  ): Observable<ApiResponse<AcquisitionType>> {
    return this.http.put<ApiResponse<unknown>>(`${this.apiUrl}/${id}`, payload).pipe(
      map((response) => this.withMappedData(response, createAcquisitionType(response.data)))
    );
  }

  /**
   * Soft-deletes an acquisition type.
   *
   * @param id Acquisition type ID.
   * @returns Observable with API response containing the deleted acquisition type.
   */
  deleteAcquisitionType(id: string): Observable<ApiResponse<AcquisitionType>> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => this.withMappedData(response, createAcquisitionType(response.data)))
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
