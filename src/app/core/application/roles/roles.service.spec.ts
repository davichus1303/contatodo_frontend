import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RolesService } from './roles.service';
import { HTTP_PORT } from '../ports/http.port';
import { ApiResponse } from '../ports/api-response.interface';
import { Role } from '../../domain/models/role.model';
import { Module } from '../../domain/models/module.model';
import { CreateRoleRequest, UpdateRoleRequest } from '../dto/role-request.dto';
import { ROLES_URL, MODULES_URL } from '../../config/api-routes.constants';

describe('RolesService', () => {
  let service: RolesService;
  const httpMock = {
    get: jasmine.createSpy('get'),
    post: jasmine.createSpy('post'),
    put: jasmine.createSpy('put'),
    delete: jasmine.createSpy('delete')
  };

  const roleResponse: ApiResponse<Role> = {
    status: 200,
    message: 'OK',
    data: {
      id: 'r1',
      name: 'Admin',
      permissions: [
        { moduleOid: 'm1', permissions: { create: true, update: true, delete: false, view: true } }
      ],
      isDeleted: false,
      isActive: true,
      createdDate: '2026-01-01',
      updatedDate: '2026-01-01',
      createdBy: 'user'
    }
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: HTTP_PORT, useValue: httpMock }
      ]
    });
    service = TestBed.inject(RolesService);

    httpMock.get.calls.reset();
    httpMock.post.calls.reset();
    httpMock.put.calls.reset();
    httpMock.delete.calls.reset();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch all roles through GET on the roles URL', () => {
    httpMock.get.and.returnValue(of({ ...roleResponse, data: [roleResponse.data] }));

    service.getRoles().subscribe();

    expect(httpMock.get).toHaveBeenCalledWith(ROLES_URL);
  });

  it('should fetch all modules through GET on the modules URL', () => {
    const modules: Module[] = [{ id: 'm1', name: 'Ventas', link: '/sales' }];
    httpMock.get.and.returnValue(of({ status: 200, message: 'OK', data: modules }));

    service.getModules().subscribe();

    expect(httpMock.get).toHaveBeenCalledWith(MODULES_URL);
  });

  it('should create a role through a POST with the request payload', () => {
    const request: CreateRoleRequest = {
      name: 'Admin',
      permissions: [
        { moduleOid: 'm1', permissions: { create: true, update: false, delete: false, view: true } }
      ]
    };
    httpMock.post.and.returnValue(of(roleResponse));

    service.createRole(request).subscribe();

    expect(httpMock.post).toHaveBeenCalledWith(ROLES_URL, request);
  });

  it('should update a role through a PUT against its URL with the request payload', () => {
    const request: UpdateRoleRequest = { name: 'Admin v2' };
    httpMock.put.and.returnValue(of(roleResponse));

    service.updateRole('r1', request).subscribe();

    expect(httpMock.put).toHaveBeenCalledWith(`${ROLES_URL}/r1`, request);
  });

  it('should delete a role through DELETE against its URL', () => {
    httpMock.delete.and.returnValue(of(roleResponse));

    service.deleteRole('r1').subscribe();

    expect(httpMock.delete).toHaveBeenCalledWith(`${ROLES_URL}/r1`);
  });
});