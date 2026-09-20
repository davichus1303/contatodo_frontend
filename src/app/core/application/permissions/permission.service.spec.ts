import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PermissionService } from './permission.service';
import { AuthService } from '../../auth/auth.service';
import { ModulesService } from '../modules/modules.service';
import { ApiResponse } from '../ports/api-response.interface';
import { Module } from '../../domain/models/module.model';

/**
 * Builds a compact JWT token with the given payload and a fake signature.
 *
 * @param payload JSON payload claims.
 * @returns Token string in {@code header.payload.signature} form.
 */
function buildToken(payload: Record<string, unknown>): string {
  const encode = (value: unknown): string =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

  return `${encode({ alg: 'HS256' })}.${encode(payload)}.fake-signature`;
}

const productsModule: Module = { id: 'm1', name: 'Productos', link: '/products' };
const salesModule: Module = { id: 'm2', name: 'Ventas', link: '/sales' };

const moduleResponse: ApiResponse<Module[]> = {
  status: 200,
  message: 'OK',
  data: [productsModule, salesModule]
};

describe('PermissionService', () => {
  let service: PermissionService;
  let getTokenSpy: jasmine.Spy;
  let getModulesSpy: jasmine.Spy;

  beforeEach(() => {
    getTokenSpy = jasmine.createSpy('getToken');
    getModulesSpy = jasmine.createSpy('getModules').and.returnValue(of(moduleResponse));

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { getToken: getTokenSpy } },
        { provide: ModulesService, useValue: { getModules: getModulesSpy } }
      ]
    });

    service = TestBed.inject(PermissionService);
    getTokenSpy.calls.reset();
    getModulesSpy.calls.reset();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isRoot', () => {
    it('should be true when the role claim is ROOT', () => {
      getTokenSpy.and.returnValue(buildToken({ sub: 'root@example.com', role: 'ROOT' }));

      expect(service.isRoot()).toBeTrue();
    });

    it('should be true when the role name is Root', () => {
      getTokenSpy.and.returnValue(buildToken({ sub: 'root@example.com', roleName: 'Root' }));

      expect(service.isRoot()).toBeTrue();
    });

    it('should be false for any other role', () => {
      getTokenSpy.and.returnValue(buildToken({ sub: 'admin@example.com', role: 'Admin' }));

      expect(service.isRoot()).toBeFalse();
    });

    it('should be false without a token', () => {
      getTokenSpy.and.returnValue(null);

      expect(service.isRoot()).toBeFalse();
    });
  });

  describe('has', () => {
    it('should allow an action granted by the role', () => {
      getTokenSpy.and.returnValue(
        buildToken({
          sub: 'user@example.com',
          permissionOfRole: [
            { moduleOid: 'm1', permissions: { create: true, update: false, delete: false, view: true } }
          ]
        })
      );

      expect(service.has('m1', 'view')).toBeTrue();
      expect(service.has('m1', 'create')).toBeTrue();
      expect(service.has('m1', 'update')).toBeFalse();
    });

    it('should deny an action not granted by the role', () => {
      getTokenSpy.and.returnValue(
        buildToken({
          sub: 'user@example.com',
          permissionOfRole: [
            { moduleOid: 'm1', permissions: { create: false, update: false, delete: false, view: true } }
          ]
        })
      );

      expect(service.has('m1', 'delete')).toBeFalse();
    });

    it('should deny modules absent from the role', () => {
      getTokenSpy.and.returnValue(
        buildToken({
          sub: 'user@example.com',
          permissionOfRole: [
            { moduleOid: 'm1', permissions: { create: true, update: true, delete: true, view: true } }
          ]
        })
      );

      expect(service.has('m2', 'view')).toBeFalse();
    });

    it('should allow everything for the root role', () => {
      getTokenSpy.and.returnValue(
        buildToken({ sub: 'root@example.com', role: 'ROOT', permissionOfRole: [] })
      );

      expect(service.has('m1', 'delete')).toBeTrue();
    });

    it('should deny everything without a token', () => {
      getTokenSpy.and.returnValue(null);

      expect(service.has('m1', 'view')).toBeFalse();
    });
  });

  describe('hasAccessByLink', () => {
    it('should resolve the module by link and check the action', () => {
      getTokenSpy.and.returnValue(
        buildToken({
          sub: 'user@example.com',
          permissionOfRole: [
            { moduleOid: 'm1', permissions: { create: true, update: false, delete: false, view: true } }
          ]
        })
      );

      service.hasAccessByLink('/products', 'view').subscribe((allowed) => {
        expect(allowed).toBeTrue();
      });
      service.hasAccessByLink('/products', 'update').subscribe((allowed) => {
        expect(allowed).toBeFalse();
      });

      expect(getModulesSpy).toHaveBeenCalled();
    });

    it('should deny links not present in the module catalog', () => {
      getTokenSpy.and.returnValue(
        buildToken({
          sub: 'user@example.com',
          roleName: 'Admin',
          permissionOfRole: [
            { moduleOid: 'm1', permissions: { create: true, update: true, delete: true, view: true } }
          ]
        })
      );

      service.hasAccessByLink('/unknown', 'view').subscribe((allowed) => {
        expect(allowed).toBeFalse();
      });
    });

    it('should allow root immediately without loading modules', () => {
      getTokenSpy.and.returnValue(
        buildToken({ sub: 'root@example.com', role: 'ROOT' })
      );

      service.hasAccessByLink('/products', 'delete').subscribe((allowed) => {
        expect(allowed).toBeTrue();
      });

      expect(getModulesSpy).not.toHaveBeenCalled();
    });

    it('should load the modules catalog only once', () => {
      getTokenSpy.and.returnValue(
        buildToken({
          sub: 'user@example.com',
          roleName: 'Admin',
          permissionOfRole: [
            { moduleOid: 'm1', permissions: { create: false, update: false, delete: false, view: true } }
          ]
        })
      );

      service.hasAccessByLink('/products', 'view').subscribe();
      service.hasAccessByLink('/sales', 'view').subscribe();

      expect(getModulesSpy).toHaveBeenCalledTimes(1);
    });
  });
});