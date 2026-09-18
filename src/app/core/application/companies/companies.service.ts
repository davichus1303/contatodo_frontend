import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HTTP_PORT } from '../ports/http.port';
import { ApiResponse } from '../ports/api-response.interface';
import { Company } from '../../domain/models/company.model';
import { COMPANIES_URL } from '../../config/api-routes.constants';

/**
 * Use cases for the companies catalog.
 */
@Injectable({
  providedIn: 'root'
})
export class CompaniesService {
  private readonly http = inject(HTTP_PORT);
  private readonly apiUrl = COMPANIES_URL;

  /**
   * Retrieves all non-deleted companies with their resolved contact data.
   *
   * @returns Observable with API response containing all companies.
   */
  getCompanies(): Observable<ApiResponse<Company[]>> {
    return this.http.get<ApiResponse<Company[]>>(this.apiUrl);
  }
}
