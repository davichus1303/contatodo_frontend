import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../../shared/interfaces/api-response.interface';
import { AcquisitionType } from '../../shared/models/acquisition-type.model';
import { ACQUISITION_TYPES_URL } from '../../shared/constants/api-routes.constants';
import { CreateAcquisitionTypeRequest, UpdateAcquisitionTypeRequest } from '../../shared/dto/acquisition-type-request.dto';

/**
 * Service responsible for acquisition type operations.
 */
@Injectable({
  providedIn: 'root'
})
export class AcquisitionTypeService {
  private readonly API_URL = ACQUISITION_TYPES_URL;

  constructor(private readonly http: HttpClient) {}

  /**
   * Retrieves all active and non-deleted acquisition types.
   *
   * @returns Observable with API response containing acquisition types.
   */
  getAcquisitionTypes(): Observable<ApiResponse<AcquisitionType[]>> {
    return this.http.get<ApiResponse<AcquisitionType[]>>(this.API_URL);
  }

  /**
   * Retrieves all non-deleted acquisition types (both active and inactive) for administration.
   *
   * @returns Observable with API response containing acquisition types.
   */
  getAllNotDeletedAcquisitionTypes(): Observable<ApiResponse<AcquisitionType[]>> {
    return this.http.get<ApiResponse<AcquisitionType[]>>(`${this.API_URL}/admin/all`);
  }

  createAcquisitionType(payload: CreateAcquisitionTypeRequest): Observable<ApiResponse<AcquisitionType>> {
    return this.http.post<ApiResponse<AcquisitionType>>(this.API_URL, payload);
  }

  updateAcquisitionType(id: string, payload: UpdateAcquisitionTypeRequest): Observable<ApiResponse<AcquisitionType>> {
    return this.http.put<ApiResponse<AcquisitionType>>(`${this.API_URL}/${id}`, payload);
  }

  deleteAcquisitionType(id: string): Observable<ApiResponse<AcquisitionType>> {
    return this.http.delete<ApiResponse<AcquisitionType>>(`${this.API_URL}/${id}`);
  }
}
