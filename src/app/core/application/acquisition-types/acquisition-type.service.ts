import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HTTP_PORT } from '../ports/http.port';
import { ApiResponse } from '../ports/api-response.interface';
import { AcquisitionType } from '../../domain/models/acquisition-type.model';
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
    return this.http.get<ApiResponse<AcquisitionType[]>>(this.apiUrl);
  }

  /**
   * Retrieves all non-deleted acquisition types (both active and inactive) for administration.
   *
   * @returns Observable with API response containing acquisition types.
   */
  getAllNotDeletedAcquisitionTypes(): Observable<ApiResponse<AcquisitionType[]>> {
    return this.http.get<ApiResponse<AcquisitionType[]>>(`${this.apiUrl}/admin/all`);
  }

  /**
   * Creates a new acquisition type.
   *
   * @param payload Creation request data.
   * @returns Observable with API response containing the created acquisition type.
   */
  createAcquisitionType(payload: CreateAcquisitionTypeRequest): Observable<ApiResponse<AcquisitionType>> {
    return this.http.post<ApiResponse<AcquisitionType>>(this.apiUrl, payload);
  }

  /**
   * Updates an existing acquisition type.
   *
   * @param id Acquisition type ID.
   * @param payload Update request data.
   * @returns Observable with API response containing the updated acquisition type.
   */
  updateAcquisitionType(id: string, payload: UpdateAcquisitionTypeRequest): Observable<ApiResponse<AcquisitionType>> {
    return this.http.put<ApiResponse<AcquisitionType>>(`${this.apiUrl}/${id}`, payload);
  }

  /**
   * Soft-deletes an acquisition type.
   *
   * @param id Acquisition type ID.
   * @returns Observable with API response containing the deleted acquisition type.
   */
  deleteAcquisitionType(id: string): Observable<ApiResponse<AcquisitionType>> {
    return this.http.delete<ApiResponse<AcquisitionType>>(`${this.apiUrl}/${id}`);
  }
}
