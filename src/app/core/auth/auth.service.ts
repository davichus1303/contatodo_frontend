import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { HTTP_PORT } from '../application/ports/http.port';
import { STORAGE_PORT } from '../application/ports/storage.port';
import { ApiResponse } from '../application/ports/api-response.interface';
import { LoginResponse } from '../application/dto/login-response.dto';
import { BASE_URL } from '../config/api-routes.constants';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_info';

/**
 * Application service managing the user session: login, logout and
 * authentication state.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HTTP_PORT);
  private readonly storage = inject(STORAGE_PORT);
  private readonly router = inject(Router);

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor() {
    this.checkAuthStatus();
  }

  /**
   * Logs in a user with email and password.
   *
   * On success the token and user information are persisted and the
   * authentication state becomes true.
   *
   * @param email User email.
   * @param password User password.
   * @returns Observable with login response.
   */
  login(email: string, password: string): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${BASE_URL}/login`, { email, password }).pipe(
      tap((response: ApiResponse<LoginResponse>) => {
        if (response.status === 200 && response.data?.token) {
          this.setToken(response.data.token);
          this.setUserInfo(response.data.user);
          this.isAuthenticatedSubject.next(true);
        }
      })
    );
  }

  /**
   * Logs out the current user, clears stored session data and redirects to
   * the login page.
   */
  logout(): void {
    this.removeToken();
    this.removeUserInfo();
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
  }

  /**
   * Returns the current authentication token.
   *
   * @returns JWT token or null.
   */
  getToken(): string | null {
    return this.storage.getItem(TOKEN_KEY);
  }

  /**
   * Returns the current user information.
   *
   * @returns User information or null.
   */
  getUserInfo(): LoginResponse['user'] | null {
    const userInfo = this.storage.getItem(USER_KEY);
    if (!userInfo) {
      return null;
    }
    try {
      return JSON.parse(userInfo) as LoginResponse['user'];
    } catch {
      return null;
    }
  }

  /**
   * Checks if the user is authenticated.
   *
   * @returns True if authenticated, false otherwise.
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Stores the JWT token.
   *
   * @param token JWT token.
   */
  private setToken(token: string): void {
    this.storage.setItem(TOKEN_KEY, token);
  }

  /**
   * Removes the stored JWT token.
   */
  private removeToken(): void {
    this.storage.removeItem(TOKEN_KEY);
  }

  /**
   * Stores user information as JSON.
   *
   * @param user User information.
   */
  private setUserInfo(user: LoginResponse['user']): void {
    this.storage.setItem(USER_KEY, JSON.stringify(user));
  }

  /**
   * Removes stored user information.
   */
  private removeUserInfo(): void {
    this.storage.removeItem(USER_KEY);
  }

  /**
   * Restores the authentication state from the persisted token.
   */
  private checkAuthStatus(): void {
    const token = this.getToken();
    this.isAuthenticatedSubject.next(!!token);
  }
}
