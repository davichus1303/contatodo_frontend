import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HTTP_PORT } from '../ports/http.port';
import { ApiResponse } from '../ports/api-response.interface';
import { Sale } from '../../domain/models/sale.model';
import { CreateSaleRequest } from '../dto/create-sale-request.dto';
import { SALES_URL } from '../../config/api-routes.constants';

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
    return this.http.post<ApiResponse<Sale>>(this.apiUrl, request);
  }

  /**
   * Retrieves today's sales for the authenticated user.
   *
   * @returns Observable with API response containing today's sales.
   */
  getTodaySales(): Observable<ApiResponse<Sale[]>> {
    return this.http.get<ApiResponse<Sale[]>>(this.apiUrl);
  }

  /**
   * Retrieves sales for the authenticated user by date.
   *
   * @param date Sale date in YYYY-MM-DD format.
   * @returns Observable with API response containing sales for the specified date.
   */
  getSalesByDate(date: string): Observable<ApiResponse<Sale[]>> {
    return this.http.get<ApiResponse<Sale[]>>(`${this.apiUrl}/date?date=${date}`);
  }

  /**
   * Retrieves sales for the authenticated user by date range.
   *
   * @param startDate Start date.
   * @param endDate End date.
   * @returns Observable with API response containing sales for the date range.
   */
  getSalesByDateRange(startDate: Date, endDate: Date): Observable<ApiResponse<Sale[]>> {
    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);
    return this.http.get<ApiResponse<Sale[]>>(`${this.apiUrl}/date-range?startDate=${startStr}&endDate=${endStr}`);
  }
}

/**
 * Formats a date as YYYY-MM-DD string.
 *
 * @param date Date to format.
 * @returns Formatted date string.
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
