import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../../shared/interfaces/api-response.interface';
import { Module } from '../../shared/models/module.model';
import { BASE_URL } from '../../shared/constants/api-routes.constants';

/**
 * Service responsible for modules operations.
 */
@Injectable({
  providedIn: 'root'
})
export class ModulesService {
  private readonly API_URL = `${BASE_URL}/modules`;

  constructor(private http: HttpClient) {}

  /**
   * Retrieves modules accessible to the authenticated user.
   *
   * @returns Observable with API response containing the list of modules.
   */
  getModules(): Observable<ApiResponse<Module[]>> {
    return this.http.get<ApiResponse<Module[]>>(this.API_URL);
  }
}
