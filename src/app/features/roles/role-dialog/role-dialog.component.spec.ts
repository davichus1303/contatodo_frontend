import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of, throwError } from 'rxjs';
import { RoleDialogComponent } from './role-dialog.component';
import { RolesService } from '@core/application/roles/roles.service';
import { NotificationService } from '@core/application/notifications/notification.service';
import { Module } from '@core/domain/models/module.model';
import { Role } from '@core/domain/models/role.model';
import { CreateRoleRequest, UpdateRoleRequest } from '@core/application/dto/role-request.dto';
import { RoleDialogData, RoleDialogLabels } from '@shared/interfaces/role-dialog.interfaces';

describe('RoleDialogComponent', () => {
  let component: RoleDialogComponent;
  let fixture: ComponentFixture<RoleDialogComponent>;
  let createRoleSpy: jasmine.Spy;
  let updateRoleSpy: jasmine.Spy;
  let successSpy: jasmine.Spy;
  let errorSpy: jasmine.Spy;
  let closeSpy: jasmine.Spy;

  const labels: RoleDialogLabels = {
    title: 'Rol',
    nameLabel: 'Nombre',
    namePlaceholder: 'Nombre del rol',
    permissionsSectionLabel: 'Permisos',
    allPermissionsLabel: 'Todos',
    permissionLabels: { create: 'Crear', update: 'Editar', delete: 'Eliminar', view: 'Ver' },
    cancel: 'Cancelar',
    save: 'Guardar',
    nameRequired: 'El nombre es requerido',
    permissionsRequired: 'Selecciona al menos un permiso',
    modulesError: 'Error cargando módulos',
    createdMessage: 'Rol creado',
    createError: 'Error creando',
    updatedMessage: 'Rol actualizado',
    updateError: 'Error actualizando'
  };

  const modules: Module[] = [
    { id: 'm1', name: 'Ventas', link: '/sales' },
    { id: 'm2', name: 'Productos', link: '/products' }
  ];

  const role: Role = {
    id: 'r1',
    name: 'Admin',
    permissions: [
      { moduleOid: 'm1', permissions: { create: true, update: true, delete: false, view: true } },
      { moduleOid: 'm2', permissions: { create: false, update: false, delete: false, view: false } }
    ],
    isDeleted: false,
    isActive: true,
    createdDate: '2026-01-01',
    updatedDate: '2026-01-01',
    createdBy: 'user'
  };

  function configure(data: RoleDialogData, rolesServiceOverrides: Partial<Record<'getModules' | 'createRole' | 'updateRole', jasmine.Spy>> = {}): void {
    TestBed.configureTestingModule({
      imports: [RoleDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close: closeSpy } },
        {
          provide: RolesService,
          useValue: {
            getModules: jasmine.createSpy('getModules').and.returnValue(of({ status: 200, message: 'OK', data: modules })),
            createRole: createRoleSpy,
            updateRole: updateRoleSpy,
            ...rolesServiceOverrides
          }
        },
        { provide: NotificationService, useValue: { success: successSpy, error: errorSpy } },
        provideAnimationsAsync()
      ]
    });

    fixture = TestBed.createComponent(RoleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    createRoleSpy = jasmine.createSpy('createRole');
    updateRoleSpy = jasmine.createSpy('updateRole');
    successSpy = jasmine.createSpy('success');
    errorSpy = jasmine.createSpy('error');
    closeSpy = jasmine.createSpy('close');
  });

  describe('in create mode', () => {
    beforeEach(() => {
      configure({ mode: 'create', labels });
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should load modules and build an empty permission control per module', () => {
      expect(component.modules().length).toBe(2);
      expect(component.form.controls.permissions.length).toBe(2);

      const first = component.permissionGroupAt(0).controls;
      expect(first.create.value).toBeFalse();
      expect(first.update.value).toBeFalse();
      expect(first.delete.value).toBeFalse();
      expect(first.view.value).toBeFalse();
    });

    it('should not create a role when the form is invalid', () => {
      component.form.controls.name.setValue(' ');
      component.permissionGroupAt(0).controls.create.setValue(true);

      component.submit();

      expect(createRoleSpy).not.toHaveBeenCalled();
      expect(closeSpy).not.toHaveBeenCalled();
    });

    it('should not create a role when no permission is selected', () => {
      component.form.controls.name.setValue('Admin');

      component.submit();

      expect(createRoleSpy).not.toHaveBeenCalled();
      expect(closeSpy).not.toHaveBeenCalled();
    });

    it('should submit the selected permissions and close with confirmation', () => {
      component.form.controls.name.setValue('  Admin  ');
      component.permissionGroupAt(0).controls.create.setValue(true);
      component.permissionGroupAt(0).controls.view.setValue(true);
      createRoleSpy.and.returnValue(of({ status: 200, message: 'OK', data: role }));

      component.submit();

      const expected: CreateRoleRequest = {
        name: 'Admin',
        permissions: [
          { moduleOid: 'm1', permissions: { create: true, update: false, delete: false, view: true } }
        ]
      };
      expect(createRoleSpy).toHaveBeenCalledWith(expected);
      expect(successSpy).toHaveBeenCalledWith(labels.createdMessage);
      expect(closeSpy).toHaveBeenCalledWith(true);
    });

    it('should notify the error and keep the dialog open when creation fails', () => {
      component.form.controls.name.setValue('Admin');
      component.permissionGroupAt(0).controls.create.setValue(true);
      createRoleSpy.and.returnValue(throwError(() => ({ error: { message: 'boom' } })));

      component.submit();

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(closeSpy).not.toHaveBeenCalled();
      expect(component.isSaving()).toBeFalse();
    });

    it('should toggle every permission of a module with the all-permissions checkbox', () => {
      component.onAllPermissionsChange(0, true);

      const controls = component.permissionGroupAt(0).controls;
      expect(controls.create.value).toBeTrue();
      expect(controls.update.value).toBeTrue();
      expect(controls.delete.value).toBeTrue();
      expect(controls.view.value).toBeTrue();
      expect(component.isAllPermissionsSelected(0)).toBeTrue();
    });
  });

  describe('in edit mode', () => {
    beforeEach(() => {
      configure({ mode: 'edit', role, labels });
    });

    it('should prefill the name and the module permissions from the provided role', () => {
      expect(component.form.controls.name.value).toBe('Admin');
      expect(component.form.controls.permissions.length).toBe(2);

      const m1 = component.permissionGroupAt(0).controls;
      expect(m1.create.value).toBeTrue();
      expect(m1.update.value).toBeTrue();
      expect(m1.delete.value).toBeFalse();
      expect(m1.view.value).toBeTrue();

      const m2 = component.permissionGroupAt(1).controls;
      expect(m2.create.value).toBeFalse();
      expect(m2.update.value).toBeFalse();
      expect(m2.delete.value).toBeFalse();
      expect(m2.view.value).toBeFalse();
    });

    it('should submit the updated data to the update endpoint with the role id', () => {
      component.form.controls.name.setValue('Gerente');
      component.permissionGroupAt(0).controls.delete.setValue(true);
      updateRoleSpy.and.returnValue(of({ status: 200, message: 'OK', data: role }));

      component.submit();

      const expected: UpdateRoleRequest = {
        name: 'Gerente',
        permissions: [
          {
            moduleOid: 'm1',
            permissions: { create: true, update: true, delete: true, view: true }
          }
        ]
      };
      expect(updateRoleSpy).toHaveBeenCalledWith('r1', expected);
      expect(successSpy).toHaveBeenCalledWith(labels.updatedMessage);
      expect(closeSpy).toHaveBeenCalledWith(true);
    });

    it('should notify the error and keep the dialog open when the update fails', () => {
      component.permissionGroupAt(0).controls.create.setValue(true);
      updateRoleSpy.and.returnValue(throwError(() => ({ error: { message: 'boom' } })));

      component.submit();

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(closeSpy).not.toHaveBeenCalled();
      expect(component.isSaving()).toBeFalse();
    });

    it('should close without persisting when cancel is pressed', () => {
      component.form.controls.name.setValue('Otro nombre');

      component.cancel();

      expect(closeSpy).toHaveBeenCalled();
      expect(updateRoleSpy).not.toHaveBeenCalled();
      expect(createRoleSpy).not.toHaveBeenCalled();
    });
  });
});