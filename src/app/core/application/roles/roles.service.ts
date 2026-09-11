import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HTTP_PORT } from '../ports/http.port';
import { ApiResponse } from '../ports/api-response.interface';
import { Role } from '../../domain/models/role.model';
import { Module } from '../../domain/models/module.model';
import { UpdateRoleRequest, CreateRoleRequest } from '../dto/role-request.dto';
import { ROLES_URL, MODULES_URL } from '../../config/api-routes.constants';

/**
 * Use cases for roles and their module permissions.
 */
@Injectable({
  providedIn: 'root'
})
export class RolesService {
  private readonly http = inject(HTTP_PORT);
  private readonly apiUrl = ROLES_URL;
  private readonly modulesApiUrl = MODULES_URL;

  /**
   * Retrieves all roles.
   *
   * @returns Observable with API response containing all roles.
   */
  getRoles(): Observable<ApiResponse<Role[]>> {
    return this.http.get<ApiResponse<Role[]>>(this.apiUrl);
  }

  /**
   * Retrieves all modules.
   *
   * @returns Observable with API response containing all modules.
   */
  getModules(): Observable<ApiResponse<Module[]>> {
    return this.http.get<ApiResponse<Module[]>>(this.modulesApiUrl);
  }

  /**
   * Creates a new role.
   *
   * @param request Create role request.
   * @returns Observable with API response containing the created role.
   */
  createRole(request: CreateRoleRequest): Observable<ApiResponse<Role>> {
    return this.http.post<ApiResponse<Role>>(this.apiUrl, request);
  }

  /**
   * Updates an existing role.
   *
   * @param id Role identifier.
   * @param request Update role request.
   * @returns Observable with API response containing the updated role.
   */
  updateRole(id: string, request: UpdateRoleRequest): Observable<ApiResponse<Role>> {
    return this.http.put<ApiResponse<Role>>(`${this.apiUrl}/${id}`, request);
  }

  /**
   * Deletes an existing role.
   *
   * @param id Role identifier.
   * @returns Observable with API response of the deleted role.
   */
  deleteRole(id: string): Observable<ApiResponse<Role>> {
    return this.http.delete<ApiResponse<Role>>(`${this.apiUrl}/${id}`);
  }
}
