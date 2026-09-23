import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HTTP_PORT } from '../ports/http.port';
import { ApiResponse } from '../ports/api-response.interface';
import { createUser, User } from '../../domain/models/user.model';
import { DomainError } from '../../domain/errors/domain-error';
import { Result } from '../../domain/result';
import { mapUsers } from './user.mapper';
import { UserRequest } from '../dto/user-request.dto';
import { USERS_URL } from '../../config/api-routes.constants';

/**
 * Use cases for the users catalog.
 */
@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private readonly http = inject(HTTP_PORT);
  private readonly apiUrl = USERS_URL;

  /**
   * Retrieves all active users with their related role resolved.
   *
   * The transport payload is mapped to validated domain users before it
   * leaves the application layer.
   *
   * @returns Observable with API response containing all users.
   */
  getUsers(): Observable<ApiResponse<User[]>> {
    return this.http.get<ApiResponse<unknown>>(this.apiUrl).pipe(
      map((response) => this.withMappedData(response, mapUsers(response.data)))
    );
  }

  /**
   * Creates a new user.
   *
   * The session token is attached to the request by the authentication
   * interceptor so the backend can record the creating user.
   *
   * @param request Create user request.
   * @returns Observable with API response containing the created user.
   */
  createUser(request: UserRequest): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<unknown>>(this.apiUrl, request).pipe(
      map((response) => this.withMappedData(response, createUser(response.data)))
    );
  }

  /**
   * Updates an existing user.
   *
   * @param id User identifier.
   * @param request Update user request.
   * @returns Observable with API response containing the updated user.
   */
  updateUser(id: string, request: Partial<UserRequest>): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<unknown>>(`${this.apiUrl}/${id}`, request).pipe(
      map((response) => this.withMappedData(response, createUser(response.data)))
    );
  }

  /**
   * Deletes an existing user.
   *
   * The endpoint only needs the user identifier, which travels in the URL, so
   * no request body is sent and no data payload is returned.
   *
   * @param id User identifier.
   * @returns Observable with the API response of the deletion.
   */
  deleteUser(id: string): Observable<ApiResponse<unknown>> {
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
