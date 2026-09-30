import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatDialog } from '@angular/material/dialog';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { UsersComponent } from './users.component';
import { UsersService } from '@core/application/users/users.service';
import { CompaniesService } from '@core/application/companies/companies.service';
import { CompanySelectionService } from '@core/application/companies/company-selection.service';
import { PermissionService } from '@core/application/permissions/permission.service';
import { Company } from '@core/domain/models/company.model';
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
  let getActiveCompaniesSpy: jasmine.Spy;
  let updateUserSpy: jasmine.Spy;
  let deleteUserSpy: jasmine.Spy;
  let errorSpy: jasmine.Spy;
  let successSpy: jasmine.Spy;
  let translateSpy: jasmine.Spy;
  let dialogOpenSpy: jasmine.Spy;
  let initialGetUsersArgs: unknown[];

  const usersData: User[] = [
    {
      id: 'u1',
      userName: 'david',
      email: 'david@example.com',
      name: 'David Contado',
      phoneNumber: '987654321',
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

  const companiesData: Company[] = [
    { id: 'company-1', name: 'VichoBox', isActive: true, isDeleted: false },
    { id: 'company-2', name: 'DISTR', isActive: true, isDeleted: false }
  ];

  const companiesResponse: ApiResponse<Company[]> = {
    status: 200,
    message: 'OK',
    data: companiesData
  };

  beforeEach(() => {
    getUsersSpy = jasmine.createSpy('getUsers').and.returnValue(of(usersResponse));
    getActiveCompaniesSpy = jasmine.createSpy('getActiveCompanies').and.returnValue(of(companiesResponse));
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
        { provide: CompaniesService, useValue: { getActiveCompanies: getActiveCompaniesSpy } },
        {
          provide: PermissionService,
          useValue: { isRoot: () => false, hasAccessByLink: () => of(true) }
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
    TestBed.inject(CompanySelectionService).select(null);

    fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    initialGetUsersArgs = getUsersSpy.calls.mostRecent()?.args ?? [];
    getUsersSpy.calls.reset();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load users into plain fields and stop loading', () => {
    expect(component.users.length).toBe(2);
    expect(component.isLoading).toBeFalse();
  });

  it('should not let a company session choose a company', () => {
    expect(component.canSelectCompany).toBeFalse();
    expect(getActiveCompaniesSpy).not.toHaveBeenCalled();
  });

  it('should read the users of the session company', () => {
    expect(initialGetUsersArgs).toEqual([undefined]);
  });

  it('should show the resolved role name on a card', () => {
    expect(component.getRoleName(component.users[0])).toBe('Admin');
  });

  it('should use the localized placeholder when a user has no role', () => {
    const noRole = component.users[1];
    expect(component.getRoleName(noRole)).toBe('USERS.NO_ROLE');
    expect(translateSpy).toHaveBeenCalledWith('USERS.NO_ROLE');
  });

  it('should show the user phone number on a card', () => {
    expect(component.getPhoneNumber(component.users[0])).toBe('987654321');
  });

  it('should use the localized placeholder when a user has no phone number', () => {
    expect(component.getPhoneNumber(component.users[1])).toBe('USERS.NO_PHONE');
    expect(translateSpy).toHaveBeenCalledWith('USERS.NO_PHONE');
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

  it('should filter users by their role name', () => {
    component.searchControl.setValue('admin');
    expect(component.filteredUsers.length).toBe(1);
    expect(component.filteredUsers[0].id).toBe('u1');

    component.searchControl.setValue('VENDEDOR');
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

describe('UsersComponent (root session)', () => {
  let component: UsersComponent;
  let fixture: ComponentFixture<UsersComponent>;
  let getUsersSpy: jasmine.Spy;
  let getActiveCompaniesSpy: jasmine.Spy;
  let errorSpy: jasmine.Spy;
  let dialogOpenSpy: jasmine.Spy;

  const usersData: User[] = [
    {
      id: 'u1',
      userName: 'david',
      email: 'david@example.com',
      name: 'David Contado',
      createdDate: '2026-01-01',
      updatedDate: '2026-01-01',
      active: true
    }
  ];

  const companiesData: Company[] = [
    { id: 'company-1', name: 'VichoBox', isActive: true, isDeleted: false },
    { id: 'company-2', name: 'DISTR', isActive: true, isDeleted: false }
  ];

  /**
   * Builds the component for a root session.
   *
   * @param selectedCompanyOid Company already selected on a previous page of the session.
   * @param companiesError When true the companies request fails.
   */
  function setup(selectedCompanyOid: string | null = null, companiesError = false): void {
    getUsersSpy = jasmine
      .createSpy('getUsers')
      .and.returnValue(of({ status: 200, message: 'OK', data: usersData } as ApiResponse<User[]>));
    getActiveCompaniesSpy = jasmine.createSpy('getActiveCompanies').and.returnValue(
      companiesError
        ? throwError(() => ({ status: 500 }))
        : of({ status: 200, message: 'OK', data: companiesData } as ApiResponse<Company[]>)
    );
    errorSpy = jasmine.createSpy('error');
    dialogOpenSpy = jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(false) });

    TestBed.configureTestingModule({
      imports: [UsersComponent],
      providers: [
        {
          provide: UsersService,
          useValue: {
            getUsers: getUsersSpy,
            updateUser: jasmine.createSpy('updateUser'),
            deleteUser: jasmine.createSpy('deleteUser')
          }
        },
        { provide: CompaniesService, useValue: { getActiveCompanies: getActiveCompaniesSpy } },
        {
          provide: PermissionService,
          useValue: { isRoot: () => true, hasAccessByLink: () => of(true) }
        },
        { provide: NotificationService, useValue: { success: jasmine.createSpy('success'), error: errorSpy } },
        { provide: I18nService, useValue: { translate: (key: string) => key } },
        provideAnimationsAsync()
      ]
    });
    TestBed.overrideComponent(UsersComponent, {
      add: {
        providers: [{ provide: MatDialog, useValue: { open: dialogOpenSpy } }]
      }
    });
    TestBed.inject(CompanySelectionService).select(selectedCompanyOid);

    fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.inject(CompanySelectionService).select(null);
  });

  it('should offer the company selector and load the companies', () => {
    setup();

    expect(component.canSelectCompany).toBeTrue();
    expect(getActiveCompaniesSpy).toHaveBeenCalled();
    expect(component.companies.length).toBe(2);
    expect(fixture.nativeElement.querySelector('mat-select')).toBeTruthy();
  });

  it('should not read the users until a company is selected', () => {
    setup();

    expect(getUsersSpy).not.toHaveBeenCalled();
    expect(component.users.length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('USERS.SELECT_COMPANY_PROMPT');
  });

  it('should read the users of the selected company and share the selection', () => {
    setup();

    component.onCompanySelected('company-2');

    expect(getUsersSpy).toHaveBeenCalledWith('company-2');
    expect(component.users.length).toBe(1);
    expect(TestBed.inject(CompanySelectionService).companyOid()).toBe('company-2');
  });

  it('should inherit the company selected on another page of the session', () => {
    setup('company-2');

    expect(component.companyOid).toBe('company-2');
    expect(getUsersSpy).toHaveBeenCalledWith('company-2');
  });

  it('should preselect the browsed company when creating a user', () => {
    setup();

    component.onCompanySelected('company-1');
    component.openCreateDialog();

    const dialogData = dialogOpenSpy.calls.mostRecent().args[1].data as UserFormDialogData;
    expect(dialogData.companyOid).toBe('company-1');
    expect(dialogData.user).toBeUndefined();
  });

  it('should not preselect a company when editing a user', () => {
    setup();
    const user = { ...usersData[0], companyOid: 'company-1' } as User;

    component.onCompanySelected('company-2');
    component.openEditDialog(user);

    const dialogData = dialogOpenSpy.calls.mostRecent().args[1].data as UserFormDialogData;
    expect(dialogData.user).toBe(user);
    expect(dialogData.companyOid).toBeUndefined();
  });

  it('should notify the error when the companies cannot be loaded', () => {
    setup(null, true);

    expect(errorSpy).toHaveBeenCalled();
    expect(component.companies.length).toBe(0);
  });
});
