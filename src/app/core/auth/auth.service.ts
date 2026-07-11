import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';
import { BASE_URL } from '../../shared/constants/api-routes.constants';
import { ApiResponse } from '../../shared/interfaces/api-response.interface';
import { LoginResponse } from '../../shared/dto/login-response.dto';

/**
 * Service responsible for authentication operations.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'user_info';
  private readonly API_URL = BASE_URL;

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    if (typeof window !== 'undefined') {
      this.checkAuthStatus();
    }
  }

  /**
   * Logs in a user with email and password.
   *
   * @param email User email.
   * @param password User password.
   * @returns Observable with login response.
   */
  login(email: string, password: string): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.API_URL}/login`, { email, password }).pipe(
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
   * Logs out the current user.
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
    if (typeof window === 'undefined') {
      return null;
    }
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Returns the current user information.
   *
   * @returns User information or null.
   */
  getUserInfo(): LoginResponse['user'] | null {
    if (typeof window === 'undefined') {
      return null;
    }
    const userInfo = localStorage.getItem(this.USER_KEY);
    return userInfo ? JSON.parse(userInfo) as LoginResponse['user'] : null;
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
   * Stores the JWT token in localStorage.
   *
   * @param token JWT token.
   */
  private setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  /**
   * Removes the JWT token from localStorage.
   */
  private removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }

  /**
   * Stores user information in localStorage.
   *
   * @param user User information.
   */
  private setUserInfo(user: LoginResponse['user']): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  /**
   * Removes user information from localStorage.
   */
  private removeUserInfo(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.USER_KEY);
    }
  }

  /**
   * Checks the current authentication status.
   */
  private checkAuthStatus(): void {
    const token = this.getToken();
    this.isAuthenticatedSubject.next(!!token);
  }
}
