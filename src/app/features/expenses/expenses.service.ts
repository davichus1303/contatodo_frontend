import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../../shared/interfaces/api-response.interface';
import { EXPENSES_URL } from '../../shared/constants/api-routes.constants';

export interface TotalExpensesRequest {
  startDate: string;
  endDate: string;
}

export interface TotalExpensesResponse {
  total: number;
}

/**
 * Service responsible for expenses operations.
 */
@Injectable({
  providedIn: 'root'
})
export class ExpensesService {
  private readonly API_URL = EXPENSES_URL;

  constructor(private http: HttpClient) {}

  /**
   * Retrieves total expenses for a date range.
   *
   * @param request Total expenses request with start and end dates.
   * @returns Observable with API response containing total expenses.
   */
  getTotalExpensesByDateRange(request: TotalExpensesRequest): Observable<ApiResponse<TotalExpensesResponse>> {
    return this.http.post<ApiResponse<TotalExpensesResponse>>(`${this.API_URL}/total`, request);
  }
}
