import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../../shared/interfaces/api-response.interface';
import { Acquisition } from '../../shared/models/acquisition.model';
import { CreateAcquisitionRequest } from '../../shared/dto/acquisition-request.dto';
import { ACQUISITIONS_URL } from '../../shared/constants/api-routes.constants';

/**
 * Service responsible for acquisitions operations.
 */
@Injectable({
  providedIn: 'root'
})
export class AcquisitionsService {
  private readonly API_URL = ACQUISITIONS_URL;

  constructor(private readonly http: HttpClient) {}

  /**
   * Creates a new acquisition.
   *
   * @param request Acquisition creation request.
   * @returns Observable with API response containing the created acquisition.
   */
  createAcquisition(request: CreateAcquisitionRequest): Observable<ApiResponse<Acquisition>> {
    return this.http.post<ApiResponse<Acquisition>>(this.API_URL, request);
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
      const startStr = this.formatDateTime(startDate);
      const endStr = this.formatDateTime(endDate);
      return this.http.get<ApiResponse<Acquisition[]>>(`${this.API_URL}?startDate=${startStr}&endDate=${endStr}`);
    }
    return this.http.get<ApiResponse<Acquisition[]>>(this.API_URL);
  }

  /**
   * Formats a date as ISO 8601 string.
   *
   * @param date Date to format.
   * @returns Formatted date string.
   */
  private formatDateTime(date: Date): string {
    return date.toISOString();
  }
}
