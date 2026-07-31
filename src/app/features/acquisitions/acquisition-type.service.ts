import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../../shared/interfaces/api-response.interface';
import { AcquisitionType } from '../../shared/models/acquisition-type.model';

/**
 * Service responsible for acquisition type operations.
 */
@Injectable({
  providedIn: 'root'
})
export class AcquisitionTypeService {
  private readonly API_URL = 'http://localhost:8080/acquisition-types';

  constructor(private readonly http: HttpClient) {}

  /**
   * Retrieves all active and non-deleted acquisition types.
   *
   * @returns Observable with API response containing acquisition types.
   */
  getAcquisitionTypes(): Observable<ApiResponse<AcquisitionType[]>> {
    return this.http.get<ApiResponse<AcquisitionType[]>>(this.API_URL);
  }
}
