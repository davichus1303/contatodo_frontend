import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HTTP_PORT } from '../ports/http.port';
import { ApiResponse } from '../ports/api-response.interface';
import { Company, createCompany } from '../../domain/models/company.model';
import { DomainError } from '../../domain/errors/domain-error';
import { Result } from '../../domain/result';
import { mapCompanies } from './company.mapper';
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
   * The transport payload is mapped to validated domain companies before it
   * leaves the application layer.
   *
   * @returns Observable with API response containing all companies.
   */
  getCompanies(): Observable<ApiResponse<Company[]>> {
    return this.http.get<ApiResponse<unknown>>(this.apiUrl).pipe(
      map((response) => this.withMappedData(response, mapCompanies(response.data)))
    );
  }

  /**
   * Creates one or more companies in a single call.
   *
   * @param request Bulk create request.
   * @returns Observable with API response containing the created companies.
   */
  createCompanies(request: CreateCompaniesRequest): Observable<ApiResponse<Company[]>> {
    return this.http.post<ApiResponse<unknown>>(this.apiUrl, request).pipe(
      map((response) => this.withMappedData(response, mapCompanies(response.data)))
    );
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
    return this.http.put<ApiResponse<unknown>>(`${this.apiUrl}/${id}`, request).pipe(
      map((response) => this.withMappedData(response, createCompany(response.data)))
    );
  }

  /**
   * Deletes an existing company.
   *
   * Only the company identifier travels in the path; the endpoint needs no
   * request body and returns no data, so nothing is mapped.
   *
   * @param id Company identifier.
   * @returns Observable with the API response of the deletion.
   */
  deleteCompany(id: string): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`);
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
