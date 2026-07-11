import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { Observable } from 'rxjs';

/**
 * Route Guard responsible for preventing authenticated users from accessing login.
 */
@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Determines if login route can be activated.
   *
   * @param route Activated route snapshot.
   * @param state Router state snapshot.
   * @returns Observable with boolean indicating if route can be activated.
   */
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | boolean {
    if (!this.authService.isAuthenticated()) {
      return true;
    }

    this.router.navigate(['/sales']);
    return false;
  }
}
