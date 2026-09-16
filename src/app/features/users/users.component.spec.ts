import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatDialog } from '@angular/material/dialog';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { UsersComponent } from './users.component';
import { UsersService } from '@core/application/users/users.service';
import { NotificationService } from '@core/application/notifications/notification.service';
import { I18nService } from '@core/i18n/i18n.service';
import { User } from '@core/domain/models/user.model';
import { ApiResponse } from '@core/application/ports/api-response.interface';
import { UserRequest } from '@core/application/dto/user-request.dto';
import { UserFormDialogData } from '@shared/interfaces/user-form-dialog.interfaces';
import { ConfirmationDialogData } from '@shared/interfaces/confirmation-dialog.interfaces';

describe('UsersComponent', () => {
  let component: UsersComponent;
  let fixture: ComponentFixture<UsersComponent>;
  let getUsersSpy: jasmine.Spy;
  let updateUserSpy: jasmine.Spy;
  let deleteUserSpy: jasmine.Spy;
  let errorSpy: jasmine.Spy;
  let successSpy: jasmine.Spy;
  let translateSpy: jasmine.Spy;
  let dialogOpenSpy: jasmine.Spy;

  const usersData: User[] = [
    {
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
    },
    {
      id: 'u2',
      userName: 'maria',
      email: 'maria@example.com',
      name: 'Maria Lopez',
      createdDate: '2026-01-02',
      updatedDate: '2026-01-02',
      active: false,
      role: null
    }
  ];

  const usersResponse: ApiResponse<User[]> = {
    status: 200,
    message: 'OK',
    data: usersData
  };

  beforeEach(() => {
    getUsersSpy = jasmine.createSpy('getUsers').and.returnValue(of(usersResponse));
    updateUserSpy = jasmine.createSpy('updateUser');
    deleteUserSpy = jasmine.createSpy('deleteUser');
    errorSpy = jasmine.createSpy('error');
    successSpy = jasmine.createSpy('success');
    translateSpy = jasmine.createSpy('translate').and.callFake((key: string) => key);
    dialogOpenSpy = jasmine
      .createSpy('open')
      .and.returnValue({ afterClosed: () => of(false) });

    TestBed.configureTestingModule({
      imports: [UsersComponent],
      providers: [
        {
          provide: UsersService,
          useValue: { getUsers: getUsersSpy, updateUser: updateUserSpy, deleteUser: deleteUserSpy }
        },
        { provide: NotificationService, useValue: { success: successSpy, error: errorSpy } },
        { provide: I18nService, useValue: { translate: translateSpy } },
        provideAnimationsAsync()
      ]
    });
    TestBed.overrideComponent(UsersComponent, {
      add: {
        providers: [{ provide: MatDialog, useValue: { open: dialogOpenSpy } }]
      }
    });

    fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    getUsersSpy.calls.reset();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load users into plain fields and stop loading', () => {
    expect(component.users.length).toBe(2);
    expect(component.isLoading).toBeFalse();
  });

  it('should show the resolved role name on a card', () => {
    expect(component.getRoleName(component.users[0])).toBe('Admin');
  });

  it('should use the localized placeholder when a user has no role', () => {
    const noRole = component.users[1];
    expect(component.getRoleName(noRole)).toBe('USERS.NO_ROLE');
    expect(translateSpy).toHaveBeenCalledWith('USERS.NO_ROLE');
  });

  it('should filter users by the search term across name, email and username', () => {
    component.searchControl.setValue('DAVID');
    expect(component.filteredUsers.length).toBe(1);
    expect(component.filteredUsers[0].id).toBe('u1');

    component.searchControl.setValue('maria@example.com');
    expect(component.filteredUsers.length).toBe(1);
    expect(component.filteredUsers[0].id).toBe('u2');

    component.searchControl.setValue('nope');
    expect(component.filteredUsers.length).toBe(0);
  });

  it('should return all users when the search term is empty', () => {
    component.searchControl.setValue('   ');
    expect(component.filteredUsers.length).toBe(2);
  });

  it('should update the user status after the confirmation dialog is accepted', () => {
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(true) });
    updateUserSpy.and.returnValue(of({ status: 200, message: 'OK', data: usersData[0] }));
    const user = component.users[0];

    component.onToggleChange(user, { checked: false } as MatSlideToggleChange);

    const expected: Partial<UserRequest> = { isActive: false };
    expect(updateUserSpy).toHaveBeenCalledWith('u1', expected);
    expect(successSpy).toHaveBeenCalledTimes(1);
    expect(getUsersSpy).toHaveBeenCalledTimes(1);
    expect(component.isUpdating('u1')).toBeFalse();
  });

  it('should not update the status when the confirmation is cancelled', () => {
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(false) });
    const user = component.users[0];

    component.onToggleChange(user, { checked: true } as MatSlideToggleChange);

    expect(updateUserSpy).not.toHaveBeenCalled();
    expect(getUsersSpy).toHaveBeenCalledTimes(1);
  });

  it('should open the create dialog with the users module flags and reload on confirmation', () => {
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(true) });

    component.openCreateDialog();

    expect(dialogOpenSpy).toHaveBeenCalled();
    expect(getUsersSpy).toHaveBeenCalledTimes(1);
  });

  it('should open the edit dialog for the selected user and reload on confirmation', () => {
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(true) });
    const user = component.users[0];

    component.openEditDialog(user);

    const dialogData = dialogOpenSpy.calls.mostRecent().args[1].data as UserFormDialogData;
    expect(dialogData.user).toBe(user);
    expect(dialogData.generatePassword).toBeFalse();
    expect(dialogData.showTemporaryPasswordNote).toBeFalse();
    expect(getUsersSpy).toHaveBeenCalledTimes(1);
  });

  it('should not reload the catalog when the edit dialog is dismissed', () => {
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(false) });
    const user = component.users[0];

    component.openEditDialog(user);

    expect(getUsersSpy).not.toHaveBeenCalled();
  });

  it('should delete the user after the confirmation dialog is accepted', () => {
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(true) });
    deleteUserSpy.and.returnValue(of({ status: 200, message: 'OK', data: null }));
    const user = component.users[0];

    component.onDelete(user);

    const dialogData = dialogOpenSpy.calls.mostRecent().args[1].data as ConfirmationDialogData;
    expect(dialogData.titleKey).toBe('USERS.CONFIRM_DELETE_TITLE');
    expect(dialogData.messageParams).toEqual({ email: user.email });
    expect(deleteUserSpy).toHaveBeenCalledWith('u1');
    expect(successSpy).toHaveBeenCalledTimes(1);
    expect(getUsersSpy).toHaveBeenCalledTimes(1);
    expect(component.isUpdating('u1')).toBeFalse();
  });

  it('should notify the error and keep the catalog when the deletion fails', () => {
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(true) });
    deleteUserSpy.and.returnValue(throwError(() => ({ status: 500 })));
    const user = component.users[0];

    component.onDelete(user);

    expect(errorSpy).toHaveBeenCalled();
    expect(getUsersSpy).not.toHaveBeenCalled();
    expect(component.isUpdating('u1')).toBeFalse();
  });

  it('should not delete the user when the confirmation dialog is cancelled', () => {
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(false) });
    const user = component.users[0];

    component.onDelete(user);

    expect(deleteUserSpy).not.toHaveBeenCalled();
    expect(getUsersSpy).not.toHaveBeenCalled();
  });
});