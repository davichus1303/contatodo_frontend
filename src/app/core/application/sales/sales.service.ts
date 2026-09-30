import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HTTP_PORT } from '../ports/http.port';
import { ApiResponse } from '../ports/api-response.interface';
import { Sale, createSale } from '../../domain/models/sale.model';
import { DomainError } from '../../domain/errors/domain-error';
import { Result } from '../../domain/result';
import { mapSales } from './sale.mapper';
import { CreateSaleRequest } from '../dto/create-sale-request.dto';
import { SALES_URL } from '../../config/api-routes.constants';
import { GENERAL_CONSTANTS } from '@shared/constants/general.constants';
import { formatDateISO } from '@shared/utils/format.utils';

/**
 * Use cases for sales (create, list today's sales, query by date/range).
 */
@Injectable({
  providedIn: 'root'
})
export class SalesService {
  private readonly http = inject(HTTP_PORT);
  private readonly apiUrl = SALES_URL;

  /**
   * Creates a new sale.
   *
   * @param request Sale creation request.
   * @returns Observable with API response containing the created sale.
   */
  createSale(request: CreateSaleRequest): Observable<ApiResponse<Sale>> {
    return this.http.post<ApiResponse<unknown>>(this.apiUrl, request).pipe(
      map((response) => this.withMappedData(response, createSale(response.data)))
    );
  }

  /**
   * Retrieves today's sales for the authenticated user.
   *
   * <p>The company scope is optional and only takes effect for sessions that
   * carry no company claim (a root user). For every other session the backend
   * ignores the parameter and scopes the query to the session company.</p>
   *
   * @param companyOid Owning company, or undefined to use the session company.
   * @returns Observable with API response containing today's sales.
   */
  getTodaySales(companyOid?: string): Observable<ApiResponse<Sale[]>> {
    return this.http
      .get<ApiResponse<unknown>>(this.apiUrl, {
        params: { [GENERAL_CONSTANTS.HTTP.PARAMS.COMPANY_OID]: companyOid }
      })
      .pipe(map((response) => this.withMappedData(response, mapSales(response.data))));
  }

  /**
   * Retrieves sales for the authenticated user by date range.
   *
   * <p>The company scope is optional and only takes effect for sessions that
   * carry no company claim (a root user). For every other session the backend
   * ignores the parameter and scopes the query to the session company.</p>
   *
   * @param startDate Start date.
   * @param endDate End date.
   * @param companyOid Owning company, or undefined to use the session company.
   * @returns Observable with API response containing sales for the date range.
   */
  getSalesByDateRange(startDate: Date, endDate: Date, companyOid?: string): Observable<ApiResponse<Sale[]>> {
    const startStr = formatDateISO(startDate);
    const endStr = formatDateISO(endDate);

    return this.http
      .get<ApiResponse<unknown>>(`${this.apiUrl}/date-range`, {
        params: {
          [GENERAL_CONSTANTS.HTTP.PARAMS.START_DATE]: startStr,
          [GENERAL_CONSTANTS.HTTP.PARAMS.END_DATE]: endStr,
          [GENERAL_CONSTANTS.HTTP.PARAMS.COMPANY_OID]: companyOid
        }
      })
      .pipe(map((response) => this.withMappedData(response, mapSales(response.data))));
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
