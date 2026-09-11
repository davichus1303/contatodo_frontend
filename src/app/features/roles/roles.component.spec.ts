import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { RolesComponent } from './roles.component';
import { RolesService } from '@core/application/roles/roles.service';
import { NotificationService } from '@core/application/notifications/notification.service';
import { I18nService } from '@core/i18n/i18n.service';
import { Role } from '@core/domain/models/role.model';
import { Module } from '@core/domain/models/module.model';
import { ApiResponse } from '@core/application/ports/api-response.interface';
import { UpdateRoleRequest } from '@core/application/dto/role-request.dto';
import { RoleDialogComponent } from './role-dialog/role-dialog.component';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

describe('RolesComponent', () => {
  let component: RolesComponent;
  let fixture: ComponentFixture<RolesComponent>;
  let getRolesSpy: jasmine.Spy;
  let getModulesSpy: jasmine.Spy;
  let deleteRoleSpy: jasmine.Spy;
  let updateRoleSpy: jasmine.Spy;
  let successSpy: jasmine.Spy;
  let errorSpy: jasmine.Spy;
  let translateSpy: jasmine.Spy;
  let dialogOpenSpy: jasmine.Spy;

  const modules: Module[] = [
    { id: 'm1', name: 'Ventas', link: '/sales' },
    { id: 'm2', name: 'Productos', link: '/products' },
    { id: 'm3', name: 'Compras', link: '/acquisitions' }
  ];

  const rolesData: Role[] = [
    {
      id: 'r1',
      name: 'Admin',
      permissions: [
        { moduleOid: 'm1', permissions: { create: true, update: true, delete: false, view: true } },
        { moduleOid: 'm3', permissions: { create: false, update: true, delete: false, view: true } }
      ],
      isDeleted: false,
      isActive: true,
      createdDate: '2026-01-01',
      updatedDate: '2026-01-01',
      createdBy: 'user'
    }
  ];

  const moduleResponse: ApiResponse<Module[]> = {
    status: 200,
    message: 'OK',
    data: modules
  };

  const roleResponse: ApiResponse<Role[]> = {
    status: 200,
    message: 'OK',
    data: rolesData
  };

  beforeEach(() => {
    getRolesSpy = jasmine.createSpy('getRoles').and.returnValue(of(roleResponse));
    getModulesSpy = jasmine.createSpy('getModules').and.returnValue(of(moduleResponse));
    deleteRoleSpy = jasmine.createSpy('deleteRole');
    updateRoleSpy = jasmine.createSpy('updateRole');
    successSpy = jasmine.createSpy('success');
    errorSpy = jasmine.createSpy('error');
    translateSpy = jasmine.createSpy('translate').and.callFake((key: string) => key);
    dialogOpenSpy = jasmine
      .createSpy('open')
      .and.returnValue({ afterClosed: () => of(false) });

    TestBed.configureTestingModule({
      imports: [RolesComponent],
      providers: [
        { provide: RolesService, useValue: { getRoles: getRolesSpy, getModules: getModulesSpy, updateRole: updateRoleSpy, deleteRole: deleteRoleSpy } },
        { provide: NotificationService, useValue: { success: successSpy, error: errorSpy } },
        { provide: I18nService, useValue: { translate: translateSpy } },
        provideAnimationsAsync()
      ]
    });
    TestBed.overrideComponent(RolesComponent, {
      add: {
        providers: [{ provide: MatDialog, useValue: { open: dialogOpenSpy } }]
      }
    });

    fixture = TestBed.createComponent(RolesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    getRolesSpy.calls.reset();
    getModulesSpy.calls.reset();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load roles and resolve the module names they can access', () => {
    expect(component.roles().length).toBe(1);
    expect(component.roles()[0].displayModules).toEqual(['Ventas', 'Compras']);
    expect(component.getModuleNames(component.roles()[0])).toBe('Ventas, Compras');
  });

  it('should filter roles by the search term', () => {
    component.searchControl.setValue('admin');
    expect(component.filteredRoles().length).toBe(1);

    component.searchControl.setValue('nope');
    expect(component.filteredRoles().length).toBe(0);
  });

  it('should open the create dialog and reload the roles when it confirms', () => {
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(true) });

    component.openCreateDialog();

    expect(dialogOpenSpy).toHaveBeenCalledWith(
      RoleDialogComponent,
      jasmine.objectContaining({ data: jasmine.objectContaining({ mode: 'create' }) })
    );
    expect(getRolesSpy).toHaveBeenCalledTimes(1);
  });

  it('should open the edit dialog passing the role object loaded in the view', () => {
    const viewRole = component.roles()[0];

    component.openEditDialog(viewRole);

    expect(dialogOpenSpy).toHaveBeenCalledWith(
      RoleDialogComponent,
      jasmine.objectContaining({ width: '560px' })
    );
    const passedData = dialogOpenSpy.calls.mostRecent().args[1].data;
    expect(passedData.mode).toBe('edit');
    expect(passedData.role).toBe(viewRole);
  });

  it('should not reload when the edit dialog is cancelled', () => {
    const viewRole = component.roles()[0];

    component.openEditDialog(viewRole);

    expect(getRolesSpy).not.toHaveBeenCalled();
  });

  it('should delete a role after the confirmation dialog is accepted', () => {
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(true) });
    deleteRoleSpy.and.returnValue(of({ status: 200, message: 'OK', data: rolesData[0] }));
    const viewRole = component.roles()[0];

    component.onDelete(viewRole);

    expect(deleteRoleSpy).toHaveBeenCalledWith('r1');
    expect(successSpy).toHaveBeenCalledTimes(1);
    expect(getRolesSpy).toHaveBeenCalledTimes(1);
    expect(component.isDeleting('r1')).toBeFalse();
  });

  it('should not call delete when the confirmation dialog is cancelled', () => {
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(false) });
    const viewRole = component.roles()[0];

    component.onDelete(viewRole);

    expect(deleteRoleSpy).not.toHaveBeenCalled();
  });

  it('should toggle the role status with the new value after confirmation', () => {
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(true) });
    updateRoleSpy.and.returnValue(of({ status: 200, message: 'OK', data: rolesData[0] }));
    const viewRole = component.roles()[0];

    component.onToggleChange(viewRole, { checked: false } as MatSlideToggleChange);

    const expected: UpdateRoleRequest = { isActive: false };
    expect(updateRoleSpy).toHaveBeenCalledWith('r1', expected);
    expect(successSpy).toHaveBeenCalledTimes(1);
    expect(getRolesSpy).toHaveBeenCalledTimes(1);
    expect(component.isUpdating('r1')).toBeFalse();
  });

  it('should not toggle the status when the confirmation is cancelled', () => {
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(false) });
    const viewRole = component.roles()[0];

    component.onToggleChange(viewRole, { checked: true } as MatSlideToggleChange);

    expect(updateRoleSpy).not.toHaveBeenCalled();
  });
});