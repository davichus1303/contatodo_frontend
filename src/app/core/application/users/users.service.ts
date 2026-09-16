import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HTTP_PORT } from '../ports/http.port';
import { ApiResponse } from '../ports/api-response.interface';
import { User } from '../../domain/models/user.model';
import { UpdateUserRequest } from '../dto/user-update.dto';
import { CreateUserRequest } from '../dto/user-create.dto';
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
   * @returns Observable with API response containing all users.
   */
  getUsers(): Observable<ApiResponse<User[]>> {
    return this.http.get<ApiResponse<User[]>>(this.apiUrl);
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
  createUser(request: CreateUserRequest): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(this.apiUrl, request);
  }

  /**
   * Updates an existing user.
   *
   * @param id User identifier.
   * @param request Update user request.
   * @returns Observable with API response containing the updated user.
   */
  updateUser(id: string, request: UpdateUserRequest): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.apiUrl}/${id}`, request);
  }
}
