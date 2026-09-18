import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HTTP_PORT } from '../ports/http.port';
import { ApiResponse } from '../ports/api-response.interface';
import { Role } from '../../domain/models/role.model';
import { Module } from '../../domain/models/module.model';
import { DomainError } from '../../domain/errors/domain-error';
import { Result } from '../../domain/result';
import { mapRoles } from './role.mapper';
import { mapModules } from '../modules/module.mapper';
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
   * The transport payload is mapped to validated domain roles before it
   * leaves the application layer.
   *
   * @returns Observable with API response containing all roles.
   */
  getRoles(): Observable<ApiResponse<Role[]>> {
    return this.http.get<ApiResponse<unknown>>(this.apiUrl).pipe(
      map((response) => this.withMappedData(response, mapRoles(response.data)))
    );
  }

  /**
   * Retrieves all modules.
   *
   * @returns Observable with API response containing all modules.
   */
  getModules(): Observable<ApiResponse<Module[]>> {
    return this.http.get<ApiResponse<unknown>>(this.modulesApiUrl).pipe(
      map((response) => this.withMappedData(response, mapModules(response.data)))
    );
  }

  /**
   * Creates a new role.
   *
   * The endpoint returns no data payload.
   *
   * @param request Create role request.
   * @returns Observable with the API response of the creation.
   */
  createRole(request: CreateRoleRequest): Observable<ApiResponse<unknown>> {
    return this.http.post<ApiResponse<unknown>>(this.apiUrl, request);
  }

  /**
   * Updates an existing role.
   *
   * The endpoint returns no data payload.
   *
   * @param id Role identifier.
   * @param request Update role request.
   * @returns Observable with the API response of the update.
   */
  updateRole(id: string, request: UpdateRoleRequest): Observable<ApiResponse<unknown>> {
    return this.http.put<ApiResponse<unknown>>(`${this.apiUrl}/${id}`, request);
  }

  /**
   * Deletes an existing role.
   *
   * The endpoint returns no data payload.
   *
   * @param id Role identifier.
   * @returns Observable with the API response of the deletion.
   */
  deleteRole(id: string): Observable<ApiResponse<unknown>> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`);
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
