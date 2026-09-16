import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HTTP_PORT } from '../ports/http.port';
import { ApiResponse } from '../ports/api-response.interface';
import { User } from '../../domain/models/user.model';
import { UpdateUserRequest } from '../dto/user-update.dto';
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
