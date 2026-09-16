import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HTTP_PORT } from '../ports/http.port';
import { ApiResponse } from '../ports/api-response.interface';
import { Module } from '../../domain/models/module.model';
import { MODULES_URL } from '../../config/api-routes.constants';
import { MODULES_NAVIGATION_CONSTANTS } from '../../../shared/constants/modules-navigation.constants';

/**
 * Use cases for application modules available to the authenticated user.
 */
@Injectable({
  providedIn: 'root'
})
export class ModulesService {
  private readonly http = inject(HTTP_PORT);
  private readonly apiUrl = MODULES_URL;

  /**
   * Retrieves modules accessible to the authenticated user, enriched with a
   * UI category derived from each module link.
   *
   * @returns Observable with API response containing the list of modules.
   */
  getModules(): Observable<ApiResponse<Module[]>> {
    return this.http.get<ApiResponse<Module[]>>(this.apiUrl).pipe(
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
    if (link === '/acquisition-type-catalog' || link === '/roles' || link === '/users') {
      return MODULES_NAVIGATION_CONSTANTS.CATEGORIES.CATALOG;
    }
    return undefined;
  }
}
