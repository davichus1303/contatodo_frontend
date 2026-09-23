import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { PermissionGuard } from './permission.guard';
import { AuthService } from '../auth/auth.service';
import { PermissionService } from '../application/permissions/permission.service';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let isAuthenticatedSpy: jasmine.Spy;
  let hasAccessSpy: jasmine.Spy;
  let navigateSpy: jasmine.Spy;

  const routeWithData = (data: Record<string, unknown>): ActivatedRouteSnapshot =>
    ({ data } as unknown as ActivatedRouteSnapshot);

  const emptyState = {} as RouterStateSnapshot;

  beforeEach(() => {
    isAuthenticatedSpy = jasmine.createSpy('isAuthenticated');
    hasAccessSpy = jasmine.createSpy('hasAccessByLink');
    navigateSpy = jasmine.createSpy('navigate');

    TestBed.configureTestingModule({
      providers: [
        PermissionGuard,
        { provide: AuthService, useValue: { isAuthenticated: isAuthenticatedSpy } },
        { provide: PermissionService, useValue: { hasAccessByLink: hasAccessSpy } },
        { provide: Router, useValue: { navigate: navigateSpy } }
      ]
    });

    guard = TestBed.inject(PermissionGuard);
    isAuthenticatedSpy.calls.reset();
    hasAccessSpy.calls.reset();
    navigateSpy.calls.reset();
  });

  it('should redirect to login when not authenticated', () => {
    isAuthenticatedSpy.and.returnValue(false);

    const result = guard.canActivate(routeWithData({}), emptyState);

    expect(result).toBeFalse();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });

  it('should allow routes without a permission requirement', () => {
    isAuthenticatedSpy.and.returnValue(true);

    const result = guard.canActivate(routeWithData({}), emptyState);

    expect(result).toBeTrue();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should allow navigation when the user has the required permission', () => {
    isAuthenticatedSpy.and.returnValue(true);
    hasAccessSpy.and.returnValue(of(true));

    const result = guard.canActivate(
      routeWithData({ permission: { moduleLink: '/products', action: 'view' } }),
      emptyState
    ) as Observable<boolean>;

    result.subscribe((allowed) => {
      expect(allowed).toBeTrue();
    });

    expect(hasAccessSpy).toHaveBeenCalledWith('/products', 'view');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should default the action to view', () => {
    isAuthenticatedSpy.and.returnValue(true);
    hasAccessSpy.and.returnValue(of(true));

    guard.canActivate(
      routeWithData({ permission: { moduleLink: '/products' } }),
      emptyState
    ) as Observable<boolean>;

    expect(hasAccessSpy).toHaveBeenCalledWith('/products', 'view');
  });

  it('should redirect to the forbidden page instead of the requested one', () => {
    isAuthenticatedSpy.and.returnValue(true);
    hasAccessSpy.and.returnValue(of(false));

    const result = guard.canActivate(
      routeWithData({ permission: { moduleLink: '/products', action: 'view' } }),
      emptyState
    ) as Observable<boolean>;

    result.subscribe((allowed) => {
      expect(allowed).toBeFalse();
    });

    expect(navigateSpy).toHaveBeenCalledWith(['/forbidden']);
  });
});