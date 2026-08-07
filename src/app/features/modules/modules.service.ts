import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../../shared/interfaces/api-response.interface';
import { Module } from '../../shared/models/module.model';
import { BASE_URL } from '../../shared/constants/api-routes.constants';
import { MODULES_NAVIGATION_CONSTANTS } from '../../shared/constants/modules-navigation.constants';

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
    return this.http.get<ApiResponse<Module[]>>(this.API_URL).pipe(
      map(response => {
        if (response.data) {
          response.data = response.data.map(module => ({
            ...module,
            category: this.getModuleCategory(module.link)
          }));
        }
        return response;
      })
    );
  }

  /**
   * Determines the category of a module based on its link.
   *
   * @param link Module link.
   * @returns Module category.
   */
  private getModuleCategory(link: string): string | undefined {
    if (link === '/acquisition-type-catalog') {
      return MODULES_NAVIGATION_CONSTANTS.CATEGORIES.CATALOG;
    }
    return undefined;
  }
}
