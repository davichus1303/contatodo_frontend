import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventEmitter, signal, WritableSignal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatDialog } from '@angular/material/dialog';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { CompanyCatalogComponent } from './company-catalog.component';
import { CompanyDialogComponent } from './company-dialog/company-dialog.component';
import { CompanyFormModel } from './company-dialog/company-form.model';
import { CompaniesService } from '@core/application/companies/companies.service';
import { UsersService } from '@core/application/users/users.service';
import { NotificationService } from '@core/application/notifications/notification.service';
import { I18nService } from '@core/i18n/i18n.service';
import { Company } from '@core/domain/models/company.model';
import { User } from '@core/domain/models/user.model';
import { ApiResponse } from '@core/application/ports/api-response.interface';

describe('CompanyCatalogComponent', () => {
  let component: CompanyCatalogComponent;
  let fixture: ComponentFixture<CompanyCatalogComponent>;
  let getCompaniesSpy: jasmine.Spy;
  let updateCompanySpy: jasmine.Spy;
  let createCompaniesSpy: jasmine.Spy;
  let getUsersSpy: jasmine.Spy;
  let updateUserSpy: jasmine.Spy;
  let successSpy: jasmine.Spy;
  let errorSpy: jasmine.Spy;
  let translateSpy: jasmine.Spy;
  let dialogOpenSpy: jasmine.Spy;
  let formSubmit: EventEmitter<CompanyFormModel>;
  let dialogIsSaving: WritableSignal<boolean>;

  const users: User[] = [
    {
      id: 'u1', userName: 'ana', email: 'ana@example.com', name: 'Ana',
      phoneNumber: '987654321', createdDate: '', updatedDate: '', active: true
    },
    {
      id: 'u2', userName: 'bob', email: 'bob@example.com', name: 'Bob',
      phoneNumber: null, createdDate: '', updatedDate: '', active: true
    }
  ];

  const sampleCompanies: Company[] = [
    {
      id: 'c1',
      name: 'Acme',
      rfc: 'ACM010101ABC',
      webSite: 'https://acme.example.com',
      ubication: 'Lima',
      contactUserOId: 'u1',
      contactName: 'Ana',
      contactPhone: '987654321',
      isActive: true,
      isDeleted: false
    },
    {
      id: 'c2',
      name: 'Globex',
      rfc: '',
      webSite: '',
      ubication: 'Bogota',
      contactUserOId: null,
      contactName: null,
      contactPhone: null,
      isActive: false,
      isDeleted: false
    },
    {
      id: 'c3',
      name: 'Initech',
      rfc: 'INI020202XYZ',
      webSite: 'https://initech.example.com',
      ubication: 'Quito',
      contactUserOId: null,
      contactName: null,
      contactPhone: null,
      isActive: true,
      isDeleted: true
    }
  ];

  const companiesResponse: ApiResponse<Company[]> = {
    status: 200,
    message: 'OK',
    data: sampleCompanies
  };

  beforeEach(() => {
    getCompaniesSpy = jasmine.createSpy('getCompanies').and.returnValue(of(companiesResponse));
    updateCompanySpy = jasmine.createSpy('updateCompany').and.returnValue(of({
      status: 200,
      message: 'OK',
      data: sampleCompanies[0]
    } as ApiResponse<Company>));
    createCompaniesSpy = jasmine.createSpy('createCompanies').and.returnValue(of({
      status: 200,
      message: 'OK',
      data: [sampleCompanies[0]]
    } as ApiResponse<Company[]>));
    getUsersSpy = jasmine.createSpy('getUsers').and.returnValue(of({
      status: 200,
      message: 'OK',
      data: users
    } as ApiResponse<User[]>));
    updateUserSpy = jasmine.createSpy('updateUser').and.returnValue(of({
      status: 200,
      message: 'OK',
      data: users[1]
    } as ApiResponse<User>));
    successSpy = jasmine.createSpy('success');
    errorSpy = jasmine.createSpy('error');
    translateSpy = jasmine.createSpy('translate').and.callFake((key: string) => key);
    formSubmit = new EventEmitter<CompanyFormModel>();
    dialogIsSaving = signal(false);
    dialogOpenSpy = jasmine.createSpy('open').and.returnValue({
      afterClosed: () => of(false),
      close: jasmine.createSpy('close'),
      componentInstance: { formSubmit, isSaving: dialogIsSaving }
    });

    TestBed.configureTestingModule({
      imports: [CompanyCatalogComponent],
      providers: [
        {
          provide: CompaniesService,
          useValue: {
            getCompanies: getCompaniesSpy,
            updateCompany: updateCompanySpy,
            createCompanies: createCompaniesSpy
          }
        },
        { provide: UsersService, useValue: { getUsers: getUsersSpy, updateUser: updateUserSpy } },
        { provide: NotificationService, useValue: { success: successSpy, error: errorSpy } },
        { provide: I18nService, useValue: { translate: translateSpy } },
        provideAnimationsAsync()
      ]
    });

    TestBed.overrideComponent(CompanyCatalogComponent, {
      add: { providers: [{ provide: MatDialog, useValue: { open: dialogOpenSpy } }] }
    });

    fixture = TestBed.createComponent(CompanyCatalogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load only non-deleted companies into the signal on init', () => {
    expect(getCompaniesSpy).toHaveBeenCalledTimes(1);
    expect(component.companies().map((company) => company.name)).toEqual(['Acme', 'Globex']);
    expect(component.filteredCompanies().length).toBe(2);
    expect(component.isLoading()).toBeFalse();
  });

  it('should filter by a partial term across every searchable field', () => {
    component.searchControl.setValue('globex');
    expect(component.filteredCompanies().map((company) => company.name)).toEqual(['Globex']);

    component.searchControl.setValue('010101');
    expect(component.filteredCompanies().map((company) => company.name)).toEqual(['Acme']);

    component.searchControl.setValue('acme.example');
    expect(component.filteredCompanies().map((company) => company.name)).toEqual(['Acme']);

    component.searchControl.setValue('bogota');
    expect(component.filteredCompanies().map((company) => company.name)).toEqual(['Globex']);

    component.searchControl.setValue('ana');
    expect(component.filteredCompanies().map((company) => company.name)).toEqual(['Acme']);

    component.searchControl.setValue('987654321');
    expect(component.filteredCompanies().map((company) => company.name)).toEqual(['Acme']);
  });

  it('should not match on boolean fields', () => {
    component.searchControl.setValue('true');
    expect(component.filteredCompanies().length).toBe(0);

    component.searchControl.setValue('false');
    expect(component.filteredCompanies().length).toBe(0);
  });

  it('should return all companies when the search term is blank', () => {
    component.searchControl.setValue('   ');
    expect(component.filteredCompanies().length).toBe(2);
  });

  it('should use the localized placeholder for empty optional fields', () => {
    const [acme, globex] = component.companies();

    expect(component.getFieldValue(acme.rfc, 'COMPANY_CATALOG.NOT_AVAILABLE')).toBe('ACM010101ABC');
    expect(component.getFieldValue(globex.rfc, 'COMPANY_CATALOG.NOT_AVAILABLE'))
      .toBe('COMPANY_CATALOG.NOT_AVAILABLE');
    expect(component.getFieldValue(globex.contactName, 'COMPANY_CATALOG.NO_CONTACT'))
      .toBe('COMPANY_CATALOG.NO_CONTACT');
    expect(translateSpy).toHaveBeenCalledWith('COMPANY_CATALOG.NOT_AVAILABLE');
    expect(translateSpy).toHaveBeenCalledWith('COMPANY_CATALOG.NO_CONTACT');
  });

  it('should expose the status badge class from the active flag', () => {
    expect(component.getStatusBadgeClass(true)).toBe('status-badge active');
    expect(component.getStatusBadgeClass(false)).toBe('status-badge inactive');
  });

  it('should enable create, edit and the status toggle and keep delete as a disabled placeholder', () => {
    const createButton = fixture.nativeElement.querySelector('.page-header .actions button') as HTMLButtonElement;
    expect(createButton.disabled).toBeFalse();

    const cards = fixture.nativeElement.querySelectorAll('.company-card') as NodeListOf<HTMLElement>;
    expect(cards.length).toBe(2);
    cards.forEach((card) => {
      const actionButtons = card.querySelectorAll('.card-actions > button') as NodeListOf<HTMLButtonElement>;
      expect(actionButtons.length).toBe(2);
      expect(actionButtons[0].disabled).toBeFalse();
      expect(actionButtons[1].disabled).toBeTrue();

      const switchButton = card.querySelector('.card-actions mat-slide-toggle button') as HTMLButtonElement;
      expect(switchButton.disabled).toBeFalse();
    });
  });

  it('should open the company dialog with the loaded contacts and reload when a company is saved', () => {
    dialogOpenSpy.and.returnValue({
      afterClosed: () => of(true),
      close: jasmine.createSpy('close'),
      componentInstance: { formSubmit, isSaving: dialogIsSaving }
    });
    getCompaniesSpy.calls.reset();

    component.openCreateDialog();

    expect(getUsersSpy).toHaveBeenCalledTimes(1);
    expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
    expect(dialogOpenSpy.calls.mostRecent().args[0]).toBe(CompanyDialogComponent);
    expect(dialogOpenSpy.calls.mostRecent().args[1].data.users).toBe(users);
    expect(getCompaniesSpy).toHaveBeenCalledTimes(1);
  });

  it('should open the edit dialog prefilled with the selected company', () => {
    component.openEditDialog(component.companies()[0]);

    expect(getUsersSpy).toHaveBeenCalledTimes(1);
    expect(dialogOpenSpy.calls.mostRecent().args[1].data.mode).toBe('edit');
    expect(dialogOpenSpy.calls.mostRecent().args[1].data.company).toBe(component.companies()[0]);
    expect(dialogOpenSpy.calls.mostRecent().args[1].data.users).toBe(users);
  });

  it('should update the company from the dialog output', () => {
    const company = component.companies()[0];
    component.openEditDialog(company);

    formSubmit.emit({
      name: '  Acme Updated  ',
      webSite: '',
      ubication: '',
      contactUserOId: '',
      phoneNumber: ''
    });

    expect(updateCompanySpy).toHaveBeenCalledWith('c1', { name: 'Acme Updated' });
    expect(createCompaniesSpy).not.toHaveBeenCalled();
    expect(successSpy).toHaveBeenCalledTimes(1);
  });

  it('should create the company and update a changed contact phone from the dialog output', () => {
    component.openCreateDialog();

    formSubmit.emit({
      name: '  Acme  ',
      webSite: 'https://acme.example.com',
      ubication: 'Lima',
      contactUserOId: 'u2',
      phoneNumber: '555'
    });

    expect(createCompaniesSpy).toHaveBeenCalledWith({
      companies: [{
        name: 'Acme',
        webSite: 'https://acme.example.com',
        ubication: 'Lima',
        contactUserOId: 'u2'
      }]
    });
    expect(updateUserSpy).toHaveBeenCalledWith('u2', { phoneNumber: '555' });
    expect(successSpy).toHaveBeenCalledTimes(1);
  });

  it('should not update the contact phone when it matches the stored value', () => {
    component.openCreateDialog();

    formSubmit.emit({
      name: 'Acme',
      webSite: '',
      ubication: '',
      contactUserOId: 'u1',
      phoneNumber: '987654321'
    });

    expect(updateUserSpy).not.toHaveBeenCalled();
  });

  it('should stop the dialog save state when the create request fails', () => {
    createCompaniesSpy.and.returnValue(throwError(() => ({ status: 500 })));
    component.openCreateDialog();
    dialogIsSaving.set(true);

    formSubmit.emit({
      name: 'Acme',
      webSite: '',
      ubication: '',
      contactUserOId: '',
      phoneNumber: ''
    });

    expect(errorSpy).toHaveBeenCalled();
    expect(dialogIsSaving()).toBeFalse();
  });

  it('should notify an error and not open the dialog when the contacts fail to load', () => {
    getUsersSpy.and.returnValue(throwError(() => ({ status: 500 })));

    component.openCreateDialog();

    expect(errorSpy).toHaveBeenCalled();
    expect(dialogOpenSpy).not.toHaveBeenCalled();
  });

  it('should open a confirmation dialog and update the status after acceptance', () => {
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(true) });
    getCompaniesSpy.calls.reset();

    component.onToggleChange(component.companies()[0], { checked: false } as MatSlideToggleChange);

    expect(dialogOpenSpy).toHaveBeenCalledTimes(1);
    expect(dialogOpenSpy.calls.mostRecent().args[1].data.confirmKey)
      .toBe('COMPANY_CATALOG.MESSAGES.DEACTIVATE');
    expect(updateCompanySpy).toHaveBeenCalledWith('c1', { isActive: false });
    expect(successSpy).toHaveBeenCalledTimes(1);
    expect(getCompaniesSpy).toHaveBeenCalledTimes(1);
    expect(component.isUpdating('c1')).toBeFalse();
  });

  it('should activate a company when the toggle is checked', () => {
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(true) });

    component.onToggleChange(component.companies()[1], { checked: true } as MatSlideToggleChange);

    expect(dialogOpenSpy.calls.mostRecent().args[1].data.confirmKey)
      .toBe('COMPANY_CATALOG.MESSAGES.ACTIVATE');
    expect(updateCompanySpy).toHaveBeenCalledWith('c2', { isActive: true });
  });

  it('should reload without updating when the confirmation is cancelled', () => {
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(false) });
    getCompaniesSpy.calls.reset();

    component.onToggleChange(component.companies()[0], { checked: false } as MatSlideToggleChange);

    expect(updateCompanySpy).not.toHaveBeenCalled();
    expect(getCompaniesSpy).toHaveBeenCalledTimes(1);
  });

  it('should notify an error and clear the pending state when the status update fails', () => {
    dialogOpenSpy.and.returnValue({ afterClosed: () => of(true) });
    updateCompanySpy.and.returnValue(throwError(() => ({ status: 500 })));

    component.onToggleChange(component.companies()[0], { checked: false } as MatSlideToggleChange);

    expect(errorSpy).toHaveBeenCalled();
    expect(component.isUpdating('c1')).toBeFalse();
  });

  it('should notify an error and stop loading when the request fails', () => {
    getCompaniesSpy.and.returnValue(throwError(() => ({ status: 500 })));

    component.loadCompanies();

    expect(errorSpy).toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  });
});
