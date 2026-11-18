import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HTTP_PORT } from '../ports/http.port';
import { ApiResponse } from '../ports/api-response.interface';
import { createDeal, Deal } from '../../domain/models/deal.model';
import { DomainError } from '../../domain/errors/domain-error';
import { Result } from '../../domain/result';
import { mapDeals } from './deal.mapper';
import { DEALS_URL } from '../../config/api-routes.constants';
import { CreateDealRequest, UpdateDealRequest } from '../dto/deal-request.dto';
import { GENERAL_CONSTANTS } from '@shared/constants/general.constants';

/**
 * Use cases for deals (list, create, update, soft delete).
 */
@Injectable({
  providedIn: 'root'
})
export class DealsService {
  private readonly http = inject(HTTP_PORT);
  private readonly apiUrl = DEALS_URL;

  /**
   * Retrieves all non-deleted deals for a company.
   *
   * @param companyOid Company identifier, or undefined to use the session company.
   * @returns Observable with API response containing deals.
   */
  getDeals(companyOid?: string): Observable<ApiResponse<Deal[]>> {
    return this.http
      .get<ApiResponse<unknown>>(this.apiUrl, this.companyOptions(companyOid))
      .pipe(map((response) => this.withMappedData(response, mapDeals(response.data))));
  }

  /**
   * Retrieves all active and non-deleted deals for a company.
   *
   * @param companyOid Company identifier, or undefined to use the session company.
   * @returns Observable with API response containing active, non-deleted deals.
   */
  getActiveNotDeletedDeals(companyOid?: string): Observable<ApiResponse<Deal[]>> {
    return this.http
      .get<ApiResponse<unknown>>(`${this.apiUrl}/activeNotDeleted`, this.companyOptions(companyOid))
      .pipe(map((response) => this.withMappedData(response, mapDeals(response.data))));
  }

  /**
   * Retrieves the active, non-deleted deal for a product within a company.
   *
   * <p>Returns {@code null} when no offer exists for the given product.</p>
   *
   * @param productOid Product identifier.
   * @param companyOid Company identifier, or undefined to use the session company.
   * @returns Observable with API response containing the offer, or null when absent.
   */
  getOfferByProduct(productOid: string, companyOid?: string): Observable<ApiResponse<Deal | null>> {
    return this.http
      .get<ApiResponse<unknown>>(`${this.apiUrl}/offerByProduct`, {
        params: {
          [GENERAL_CONSTANTS.HTTP.PARAMS.COMPANY_OID]: companyOid,
          productOid
        }
      })
      .pipe(map((response) => this.withMappedOffer(response)));
  }

  /**
   * Creates a new deal.
   *
   * @param payload Deal creation payload.
   * @returns Observable with API response containing the created deal.
   */
  createDeal(payload: CreateDealRequest): Observable<ApiResponse<Deal>> {
    return this.http.post<ApiResponse<unknown>>(this.apiUrl, payload).pipe(
      map((response) => this.withMappedData(response, createDeal(response.data)))
    );
  }

  /**
   * Updates an existing deal.
   *
   * @param oid Deal identifier.
   * @param payload Deal update payload.
   * @returns Observable with API response containing the updated deal.
   */
  updateDeal(oid: string, payload: UpdateDealRequest): Observable<ApiResponse<Deal>> {
    return this.http.put<ApiResponse<unknown>>(this.apiUrl, payload, { params: { oid } }).pipe(
      map((response) => this.withMappedData(response, createDeal(response.data)))
    );
  }

  /**
   * Soft-deletes a deal.
   *
   * @param oid Deal identifier.
   * @returns Observable with API response.
   */
  deleteDeal(oid: string): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(this.apiUrl, { params: { oid } });
  }

  private companyOptions(companyOid?: string): { params: { [key: string]: string | undefined } } {
    return { params: { [GENERAL_CONSTANTS.HTTP.PARAMS.COMPANY_OID]: companyOid } };
  }

  /**
   * Maps an offer lookup response, treating an empty payload as "no offer".
   *
   * @param response Raw API response.
   * @returns API response with the mapped deal or null.
   */
  private withMappedOffer(response: ApiResponse<unknown>): ApiResponse<Deal | null> {
    const raw = response.data;
    if (raw == null || (typeof raw === 'object' && !Array.isArray(raw) && Object.keys(raw as object).length === 0)) {
      return { ...response, data: null };
    }
    return this.withMappedData(response, createDeal(raw));
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
