import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HTTP_PORT } from '../ports/http.port';
import { ApiResponse } from '../ports/api-response.interface';
import { UnitOfMeasure, createUnitOfMeasure } from '../../domain/models/unit-of-measure.model';
import { DomainError } from '../../domain/errors/domain-error';
import { Result } from '../../domain/result';
import { mapUnitOfMeasures } from './unit-of-measure.mapper';
import { UNIT_OF_MEASURES_URL } from '../../config/api-routes.constants';
import { CreateUnitOfMeasureRequest, UpdateUnitOfMeasureRequest } from '../dto/unit-of-measure-request.dto';

/**
 * Use cases for units of measure (list active, list all non-deleted,
 * create, update, soft delete).
 */
@Injectable({
  providedIn: 'root'
})
export class UnitOfMeasureService {
  private readonly http = inject(HTTP_PORT);
  private readonly apiUrl = UNIT_OF_MEASURES_URL;

  /**
   * Retrieves all active and non-deleted units of measure for the selected company.
   */
  getUnitOfMeasures(companyOid?: string): Observable<ApiResponse<UnitOfMeasure[]>> {
    const options = companyOid ? { params: { companyOid } } : {};
    return this.http.get<ApiResponse<unknown>>(this.apiUrl, options).pipe(
      map((response) => this.withMappedData(response, mapUnitOfMeasures(response.data)))
    );
  }

  /**
   * Retrieves all non-deleted units of measure for administration.
   */
  getAllNotDeletedUnitOfMeasures(companyOid?: string): Observable<ApiResponse<UnitOfMeasure[]>> {
    const options = companyOid ? { params: { companyOid } } : {};
    return this.http.get<ApiResponse<unknown>>(`${this.apiUrl}/admin/all`, options).pipe(
      map((response) => this.withMappedData(response, mapUnitOfMeasures(response.data)))
    );
  }

  /**
   * Creates a new unit of measure.
   */
  createUnitOfMeasure(payload: CreateUnitOfMeasureRequest): Observable<ApiResponse<UnitOfMeasure>> {
    return this.http.post<ApiResponse<unknown>>(this.apiUrl, payload).pipe(
      map((response) => this.withMappedData(response, createUnitOfMeasure(response.data)))
    );
  }

  /**
   * Updates an existing unit of measure.
   */
  updateUnitOfMeasure(id: string, payload: UpdateUnitOfMeasureRequest): Observable<ApiResponse<UnitOfMeasure>> {
    return this.http.put<ApiResponse<unknown>>(`${this.apiUrl}/${id}`, payload).pipe(
      map((response) => this.withMappedData(response, createUnitOfMeasure(response.data)))
    );
  }

  /**
   * Soft-deletes a unit of measure.
   */
  deleteUnitOfMeasure(id: string): Observable<ApiResponse<UnitOfMeasure>> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => this.withMappedData(response, createUnitOfMeasure(response.data)))
    );
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
