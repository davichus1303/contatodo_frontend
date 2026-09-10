import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HTTP_PORT } from '../ports/http.port';
import { ApiResponse } from '../ports/api-response.interface';
import { EXPENSES_URL } from '../../config/api-routes.constants';

/**
 * Request payload for the total-expenses-by-range query.
 */
export interface TotalExpensesRequest {
  startDate: string;
  endDate: string;
}

/**
 * Response payload for the total-expenses-by-range query.
 */
export interface TotalExpensesResponse {
  total: number;
}

/**
 * Use cases for expenses (total by date range).
 */
@Injectable({
  providedIn: 'root'
})
export class ExpensesService {
  private readonly http = inject(HTTP_PORT);
  private readonly apiUrl = EXPENSES_URL;

  /**
   * Retrieves total expenses for a date range.
   *
   * @param request Total expenses request with start and end dates.
   * @returns Observable with API response containing total expenses.
   */
  getTotalExpensesByDateRange(request: TotalExpensesRequest): Observable<ApiResponse<TotalExpensesResponse>> {
    return this.http.post<ApiResponse<TotalExpensesResponse>>(`${this.apiUrl}/total`, request);
  }
}
