import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { PermissionAction } from '../auth/jwt-claims.model';
import { PermissionService } from '../application/permissions/permission.service';

/**
 * Guard that blocks a route when the current user lacks the required module
 * permission, redirecting to the forbidden page.
 *
 * <p>The route must declare the requirement through {@code route.data.permission}
 * with a {@code moduleLink} (the module route, for example {@code '/products'})
 * and an optional {@code action} (defaults to {@code view}):</p>
 *
 * <pre>
 * { path: 'products', component: ProductsComponent, canActivate: [AuthGuard, PermissionGuard], data: { permission: { moduleLink: '/products', action: 'view' } } }
 * </pre>
 */
@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router,
    private permissionService: PermissionService
  ) {}

  /**
   * Determines if a route can be activated.
   *
   * Unauthenticated users are redirected to login. Authenticated users who
   * lack the permission declared on the route are redirected to the forbidden
   * page instead of the requested one.
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
      this.router.navigate(['/login']);
      return false;
    }

    const requirement = route.data['permission'] as
      | { moduleLink?: unknown; action?: unknown }
      | undefined;

    if (typeof requirement?.moduleLink !== 'string') {
      return true;
    }

    const action = (requirement.action ?? 'view') as PermissionAction;

    return this.permissionService.hasAccessByLink(requirement.moduleLink, action).pipe(
      map((allowed: boolean) => {
        if (!allowed) {
          this.router.navigate(['/forbidden']);
        }
        return allowed;
      })
    );
  }
}