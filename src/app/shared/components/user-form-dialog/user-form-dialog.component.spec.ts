import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { UserFormDialogComponent } from './user-form-dialog.component';
import { UsersService } from '@core/application/users/users.service';
import { RolesService } from '@core/application/roles/roles.service';
import { NotificationService } from '@core/application/notifications/notification.service';
import { Role } from '@core/domain/models/role.model';
import { UserFormDialogData, UserFormDialogLabels } from '@shared/interfaces/user-form-dialog.interfaces';
import { UserRequest } from '@core/application/dto/user-request.dto';
import { User } from '@core/domain/models/user.model';

describe('UserFormDialogComponent', () => {
  let component: UserFormDialogComponent;
  let fixture: ComponentFixture<UserFormDialogComponent>;
  let createUserSpy: jasmine.Spy;
  let updateUserSpy: jasmine.Spy;
  let getRolesSpy: jasmine.Spy;
  let successSpy: jasmine.Spy;
  let errorSpy: jasmine.Spy;
  let closeSpy: jasmine.Spy;

  const labels: UserFormDialogLabels = {
    title: 'Nuevo usuario',
    userNameLabel: 'Nombre de usuario',
    userNamePlaceholder: 'Ej. jperez',
    fullNameLabel: 'Nombre completo',
    fullNamePlaceholder: 'Ej. Juan Pérez',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'Ej. juan@empresa.com',
    roleLabel: 'Rol',
    rolePlaceholder: 'Selecciona un rol',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: 'Contraseña generada',
    passwordEditPlaceholder: 'Nueva contraseña (opcional)',
    passwordGeneratedHint: 'Contraseña generada automáticamente',
    temporaryPasswordNote: 'La contraseña es temporal',
    cancel: 'Cancelar',
    save: 'Guardar',
    userNameRequired: 'requerido',
    fullNameRequired: 'requerido',
    emailRequired: 'requerido',
    emailInvalid: 'inválido',
    roleRequired: 'requerido',
    passwordRequired: 'requerido',
    rolesError: 'error roles',
    createdMessage: 'Usuario creado',
    createError: 'error creación',
    updatedMessage: 'Usuario actualizado',
    updateError: 'error actualización'
  };

  const userToEdit: User = {
    id: 'u1',
    userName: 'david',
    email: 'david@example.com',
    name: 'David Contado',
    createdDate: '2026-01-01',
    updatedDate: '2026-01-01',
    active: true,
    role: {
      id: 'r1',
      name: 'Admin',
      permissions: [],
      isDeleted: false,
      isActive: true,
      createdDate: '2026-01-01',
      updatedDate: '2026-01-01',
      createdBy: 'seed'
    }
  };

  const rolesData: Role[] = [
    {
      id: 'r1',
      name: 'Admin',
      permissions: [],
      isDeleted: false,
      isActive: true,
      createdDate: '2026-01-01',
      updatedDate: '2026-01-01',
      createdBy: 'seed'
    },
    {
      id: 'r2',
      name: 'Vendedor',
      permissions: [],
      isDeleted: false,
      isActive: true,
      createdDate: '2026-01-01',
      updatedDate: '2026-01-01',
      createdBy: 'seed'
    }
  ];

  function configureDialog(data: UserFormDialogData): void {
    TestBed.configureTestingModule({
      imports: [UserFormDialogComponent, MatSelectModule],
      providers: [
        { provide: MatDialogRef, useValue: { close: closeSpy } },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: UsersService, useValue: { createUser: createUserSpy, updateUser: updateUserSpy } },
        { provide: RolesService, useValue: { getRoles: getRolesSpy } },
        { provide: NotificationService, useValue: { success: successSpy, error: errorSpy } },
        provideAnimationsAsync()
      ]
    });

    fixture = TestBed.createComponent(UserFormDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    createUserSpy = jasmine.createSpy('createUser').and.returnValue(of({ status: 200, message: 'OK', data: null }));
    updateUserSpy = jasmine.createSpy('updateUser').and.returnValue(of({ status: 200, message: 'OK', data: null }));
    getRolesSpy = jasmine.createSpy('getRoles').and.returnValue(of({ status: 200, message: 'OK', data: rolesData }));
    successSpy = jasmine.createSpy('success');
    errorSpy = jasmine.createSpy('error');
    closeSpy = jasmine.createSpy('close');
  });

  it('should load the roles into the select', () => {
    configureDialog({ generatePassword: true, showTemporaryPasswordNote: true, labels });

    expect(getRolesSpy).toHaveBeenCalled();
    expect(component.roles.length).toBe(2);
    expect(component.isLoadingRoles).toBeFalse();
  });

  it('should prefill the password with a generated one when opened from the users module', () => {
    configureDialog({ generatePassword: true, showTemporaryPasswordNote: true, labels });

    expect(component.generatePassword).toBeTrue();
    expect(component.showTemporaryPasswordNote).toBeTrue();
    expect(component.form.controls.password.value.length).toBeGreaterThanOrEqual(8);
  });

  it('should not suggest a random password when opened without the flag', () => {
    configureDialog({ generatePassword: false, showTemporaryPasswordNote: false, labels });

    expect(component.generatePassword).toBeFalse();
    expect(component.form.controls.password.value).toBe('');
  });

  it('should close without creating anything when cancelled', () => {
    configureDialog({ generatePassword: true, showTemporaryPasswordNote: true, labels });

    component.cancel();

    expect(closeSpy).toHaveBeenCalled();
    expect(createUserSpy).not.toHaveBeenCalled();
  });

  it('should not create the user when the form is invalid', () => {
    configureDialog({ generatePassword: true, showTemporaryPasswordNote: true, labels });

    component.submit();

    expect(createUserSpy).not.toHaveBeenCalled();
    expect(component.form.controls.userName.touched).toBeTrue();
  });

  it('should build the user object from the form and create it through the endpoint', () => {
    configureDialog({ generatePassword: true, showTemporaryPasswordNote: true, labels });

    component.form.controls.userName.setValue('  jperez  ');
    component.form.controls.name.setValue('Juan Pérez');
    component.form.controls.email.setValue('juan@empresa.com');
    component.form.controls.roleId.setValue('r2');
    component.form.controls.password.setValue('Clave123!');

    component.submit();

    const expected: UserRequest = {
      userName: 'jperez',
      name: 'Juan Pérez',
      email: 'juan@empresa.com',
      roleId: 'r2',
      password: 'Clave123!'
    };
    expect(createUserSpy).toHaveBeenCalledWith(expected);
    expect(successSpy).toHaveBeenCalledWith('Usuario creado');
    expect(closeSpy).toHaveBeenCalledWith(true);
  });

  it('should notify the error and stay open when creation fails', () => {
    configureDialog({ generatePassword: true, showTemporaryPasswordNote: true, labels });
    createUserSpy.and.returnValue(throwError(() => ({ status: 500 })));

    component.form.controls.userName.setValue('jperez');
    component.form.controls.name.setValue('Juan Pérez');
    component.form.controls.email.setValue('juan@empresa.com');
    component.form.controls.roleId.setValue('r1');
    component.form.controls.password.setValue('Clave123!');

    component.submit();

    expect(errorSpy).toHaveBeenCalled();
    expect(closeSpy).not.toHaveBeenCalled();
    expect(component.isSaving).toBeFalse();
  });

  it('should prefill the form from the user when opened in edit mode', () => {
    configureDialog({
      generatePassword: false,
      showTemporaryPasswordNote: false,
      user: userToEdit,
      labels
    });

    expect(component.isEditMode).toBeTrue();
    expect(component.form.controls.userName.value).toBe('david');
    expect(component.form.controls.name.value).toBe('David Contado');
    expect(component.form.controls.email.value).toBe('david@example.com');
    expect(component.form.controls.roleId.value).toBe('r1');
    expect(component.form.controls.password.value).toBe('');
  });

  it('should keep the submit disabled until a field changes in edit mode', () => {
    configureDialog({
      generatePassword: false,
      showTemporaryPasswordNote: false,
      user: userToEdit,
      labels
    });

    expect(component.hasChanges).toBeFalse();
    expect(component.isSubmitDisabled).toBeTrue();

    component.form.controls.name.setValue('David Actualizado');

    expect(component.hasChanges).toBeTrue();
    expect(component.isSubmitDisabled).toBeFalse();
  });

  it('should not update the user when nothing changed in edit mode', () => {
    configureDialog({
      generatePassword: false,
      showTemporaryPasswordNote: false,
      user: userToEdit,
      labels
    });

    component.submit();

    expect(updateUserSpy).not.toHaveBeenCalled();
  });

  it('should update the user without a password when it is left empty', () => {
    configureDialog({
      generatePassword: false,
      showTemporaryPasswordNote: false,
      user: userToEdit,
      labels
    });
    component.form.controls.name.setValue('  David Actualizado  ');

    component.submit();

    const expected: Partial<UserRequest> = {
      userName: 'david',
      name: 'David Actualizado',
      email: 'david@example.com',
      roleId: 'r1'
    };
    expect(updateUserSpy).toHaveBeenCalledWith('u1', expected);
    expect(successSpy).toHaveBeenCalledWith('Usuario actualizado');
    expect(closeSpy).toHaveBeenCalledWith(true);
  });

  it('should include the password in the update payload when the user types one', () => {
    configureDialog({
      generatePassword: false,
      showTemporaryPasswordNote: false,
      user: userToEdit,
      labels
    });
    component.form.controls.password.setValue('Clave123!');

    component.submit();

    const expected: Partial<UserRequest> = {
      userName: 'david',
      name: 'David Contado',
      email: 'david@example.com',
      roleId: 'r1',
      password: 'Clave123!'
    };
    expect(updateUserSpy).toHaveBeenCalledWith('u1', expected);
  });

  it('should notify the error and stay open when the update fails', () => {
    configureDialog({
      generatePassword: false,
      showTemporaryPasswordNote: false,
      user: userToEdit,
      labels
    });
    updateUserSpy.and.returnValue(throwError(() => ({ status: 500 })));
    component.form.controls.email.setValue('nuevo@example.com');

    component.submit();

    expect(errorSpy).toHaveBeenCalled();
    expect(closeSpy).not.toHaveBeenCalled();
    expect(component.isSaving).toBeFalse();
  });
});