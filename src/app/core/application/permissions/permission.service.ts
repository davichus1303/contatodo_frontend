import { Injectable, inject } from '@angular/core';
import { Observable, from, map, of, take } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { ModulesService } from '../modules/modules.service';
import { Module } from '../../domain/models/module.model';
import { decodeJwtPayload } from '../../auth/jwt-utils';
import { JwtClaims, PermissionAction, parseJwtClaims } from '../../auth/jwt-claims.model';

/**
 * Role claim value emitted by the backend for the root role.
 */
const ROOT_ROLE_CLAIM = 'ROOT';

/**
 * Display name of the root role as configured in the backend.
 */
const ROOT_ROLE_NAME = 'Root';

/**
 * Authorization decisions for the current session, derived from the JWT.
 *
 * <p>Permissions are read from the token claims as a login snapshot. They
 * only drive presentation (what to show or hide); the backend revalidates
 * every request against the stored role.</p>
 */
@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private readonly authService = inject(AuthService);
  private readonly modulesService = inject(ModulesService);

  private loaded = false;
  private modulesByLink = new Map<string, Module>();
  private modulesPromise: Promise<Map<string, Module>> | null = null;

  /**
   * Whether the current user holds the root role and bypasses permissions.
   *
   * @returns True when the session role claim is {@code ROOT} or the role name is root.
   */
  isRoot(): boolean {
    const claims = this.currentClaims();
    return claims?.role === ROOT_ROLE_CLAIM || claims?.roleName === ROOT_ROLE_NAME;
  }

  /**
   * Whether the current user can perform an action over the given module.
   *
   * Root users always pass. Any other user needs an explicit true flag on the
   * module permission.
   *
   * @param moduleOid Module identifier.
   * @param action Action to check.
   * @returns True when permitted.
   */
  has(moduleOid: string, action: PermissionAction): boolean {
    if (this.isRoot()) {
      return true;
    }

    const permission = this.currentClaims()?.permissions.find((entry) => entry.moduleOid === moduleOid);
    return permission?.permissions[action] === true;
  }

  /**
   * Whether the current user can access the module at the given link.
   *
   * Resolves the module identifier from the link using the modules catalog,
   * loading it once and caching it for the session. Root users pass
   * immediately.
   *
   * @param link Module route link (for example {@code '/products'}).
   * @param action Action to check.
   * @returns Observable resolving to true when permitted.
   */
  hasAccessByLink(link: string, action: PermissionAction): Observable<boolean> {
    if (this.isRoot()) {
      return of(true);
    }

    return this.ensureModulesLoaded().pipe(
      map((modules) => {
        const module = modules.get(link);
        if (!module) {
          return false;
        }
        return this.has(module.id, action);
      })
    );
  }

  /**
   * Resolves the modules catalog keyed by link, loading it lazily once.
   *
   * A failed load falls back to an empty catalog so callers fail closed and
   * the catalog is reloaded on the next call.
   *
   * @returns Observable emitting the modules map when the catalog is ready.
   */
  private ensureModulesLoaded(): Observable<Map<string, Module>> {
    if (this.loaded) {
      return of(this.modulesByLink);
    }

    this.modulesPromise ??= this.loadModules();

    return from(this.modulesPromise);
  }

  /**
   * Fetches the modules catalog and indexes it by navigation link.
   *
   * @returns Promise resolving with the indexed catalog.
   */
  private loadModules(): Promise<Map<string, Module>> {
    return new Promise<Map<string, Module>>((resolve) => {
      this.modulesService.getModules().pipe(take(1)).subscribe({
        next: (response) => {
          this.loaded = true;
          this.modulesByLink = this.indexByLink(response.data ?? []);
          resolve(this.modulesByLink);
        },
        error: () => {
          this.modulesPromise = null;
          resolve(this.modulesByLink);
        }
      });
    });
  }

  /**
   * Indexes modules by their navigation link.
   *
   * @param modules Module catalog or empty list.
   * @returns Map of links to modules.
   */
  private indexByLink(modules: Module[]): Map<string, Module> {
    const map = new Map<string, Module>();
    modules.forEach((module) => {
      map.set(module.link, module);
    });
    return map;
  }

  /**
   * Decodes and validates the claims of the current session token.
   *
   * @returns Parsed claims, or null when there is no token or it is invalid.
   */
  private currentClaims(): JwtClaims | null {
    const token = this.authService.getToken();
    if (!token) {
      return null;
    }

    try {
      const parsed = parseJwtClaims(decodeJwtPayload(token));
      return parsed.ok ? parsed.value : null;
    } catch {
      return null;
    }
  }
}