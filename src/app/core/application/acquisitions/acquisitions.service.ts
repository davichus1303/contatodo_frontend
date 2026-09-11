import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HTTP_PORT } from '../ports/http.port';
import { ApiResponse } from '../ports/api-response.interface';
import { Acquisition } from '../../domain/models/acquisition.model';
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
    return this.http.post<ApiResponse<Acquisition>>(this.apiUrl, request);
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
    if (startDate && endDate) {
      return this.http.get<ApiResponse<Acquisition[]>>(
        `${this.apiUrl}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
    }
    return this.http.get<ApiResponse<Acquisition[]>>(this.apiUrl);
  }
}
