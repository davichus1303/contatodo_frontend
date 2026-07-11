import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../../shared/interfaces/api-response.interface';
import { Sale } from '../../shared/models/sale.model';
import { CreateSaleRequest } from '../../shared/dto/create-sale-request.dto';
import { SALES_URL } from '../../shared/constants/api-routes.constants';

/**
 * Service responsible for sales operations.
 */
@Injectable({
  providedIn: 'root'
})
export class SalesService {
  private readonly API_URL = SALES_URL;

  constructor(private http: HttpClient) {}

  /**
   * Creates a new sale.
   *
   * @param request Sale creation request.
   * @returns Observable with API response containing the created sale.
   */
  createSale(request: CreateSaleRequest): Observable<ApiResponse<Sale>> {
    return this.http.post<ApiResponse<Sale>>(this.API_URL, request);
  }

  /**
   * Retrieves today's sales for the authenticated user.
   *
   * @returns Observable with API response containing today's sales.
   */
  getTodaySales(): Observable<ApiResponse<Sale[]>> {
    return this.http.get<ApiResponse<Sale[]>>(this.API_URL);
  }

  /**
   * Retrieves sales for the authenticated user by date.
   *
   * @param date Sale date in YYYY-MM-DD format.
   * @returns Observable with API response containing sales for the specified date.
   */
  getSalesByDate(date: string): Observable<ApiResponse<Sale[]>> {
    return this.http.get<ApiResponse<Sale[]>>(`${this.API_URL}/date?date=${date}`);
  }

  /**
   * Retrieves sales for the authenticated user by date range.
   *
   * @param startDate Start date.
   * @param endDate End date.
   * @returns Observable with API response containing sales for the date range.
   */
  getSalesByDateRange(startDate: Date, endDate: Date): Observable<ApiResponse<Sale[]>> {
    const startStr = this.formatDate(startDate);
    const endStr = this.formatDate(endDate);
    return this.http.get<ApiResponse<Sale[]>>(`${this.API_URL}/date-range?startDate=${startStr}&endDate=${endStr}`);
  }

  /**
   * Formats a date as YYYY-MM-DD string.
   *
   * @param date Date to format.
   * @returns Formatted date string.
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
