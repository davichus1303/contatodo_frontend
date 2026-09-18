import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HTTP_PORT } from '../ports/http.port';
import { ApiResponse } from '../ports/api-response.interface';
import { Company } from '../../domain/models/company.model';
import { COMPANIES_URL } from '../../config/api-routes.constants';
import { CreateCompaniesRequest, UpdateCompanyRequest } from '../dto/company-request.dto';

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

  /**
   * Creates one or more companies in a single call.
   *
   * @param request Bulk create request.
   * @returns Observable with API response containing the created companies.
   */
  createCompanies(request: CreateCompaniesRequest): Observable<ApiResponse<Company[]>> {
    return this.http.post<ApiResponse<Company[]>>(this.apiUrl, request);
  }

  /**
   * Updates an existing company. Only the fields present in the request are
   * applied; the rest keep their persisted value.
   *
   * @param id Company identifier.
   * @param request Update request data.
   * @returns Observable with API response containing the updated company.
   */
  updateCompany(id: string, request: UpdateCompanyRequest): Observable<ApiResponse<Company>> {
    return this.http.put<ApiResponse<Company>>(`${this.apiUrl}/${id}`, request);
  }
}
