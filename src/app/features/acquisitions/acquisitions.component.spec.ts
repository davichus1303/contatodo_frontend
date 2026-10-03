import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of, throwError } from 'rxjs';
import { AcquisitionsComponent } from './acquisitions.component';
import { AcquisitionsService } from '@core/application/acquisitions/acquisitions.service';
import { CompaniesService } from '@core/application/companies/companies.service';
import { CompanySelectionService } from '@core/application/companies/company-selection.service';
import { PermissionService } from '@core/application/permissions/permission.service';
import { NotificationService } from '@core/application/notifications/notification.service';
import { I18nService } from '@core/i18n/i18n.service';
import { Company } from '@core/domain/models/company.model';
import { Acquisition } from '@core/domain/models/acquisition.model';
import { ApiResponse } from '@core/application/ports/api-response.interface';
import { Router } from '@angular/router';
import { ACQUISITIONS_CONSTANTS } from '@shared/constants/acquisitions.constants';

const companiesData: Company[] = [
  { id: 'company-1', name: 'VichoBox', isActive: true, isDeleted: false },
  { id: 'company-2', name: 'DISTR', isActive: true, isDeleted: false }
];

const acquisitionsData: Acquisition[] = [
  {
    id: 'a1',
    productName: 'Arroz',
    acquisitionType: 'Mercancia',
    quantity: 5,
    realCost: 50,
    unitRealCost: 10,
    unitPublicCost: 15,
    acquisitionDate: '2026-08-21T10:00:00'
  }
];

describe('AcquisitionsComponent', () => {
  let component: AcquisitionsComponent;
  let fixture: ComponentFixture<AcquisitionsComponent>;
  let getAcquisitionsSpy: jasmine.Spy;
  let getActiveCompaniesSpy: jasmine.Spy;
  let errorSpy: jasmine.Spy;

  beforeEach(() => {
    getAcquisitionsSpy = jasmine
      .createSpy('getAcquisitions')
      .and.returnValue(of({ status: 200, message: 'OK', data: acquisitionsData } as ApiResponse<Acquisition[]>));
    getActiveCompaniesSpy = jasmine
      .createSpy('getActiveCompanies')
      .and.returnValue(of({ status: 200, message: 'OK', data: companiesData } as ApiResponse<Company[]>));
    errorSpy = jasmine.createSpy('error');

    TestBed.configureTestingModule({
      imports: [AcquisitionsComponent],
      providers: [
        { provide: AcquisitionsService, useValue: { getAcquisitions: getAcquisitionsSpy } },
        { provide: CompaniesService, useValue: { getActiveCompanies: getActiveCompaniesSpy } },
        { provide: PermissionService, useValue: { isRoot: () => false, hasAccessByLink: () => of(true) } },
        { provide: NotificationService, useValue: { success: jasmine.createSpy('success'), error: errorSpy } },
        { provide: I18nService, useValue: { translate: (key: string) => key } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        provideAnimationsAsync()
      ]
    });

    fixture = TestBed.createComponent(AcquisitionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.inject(CompanySelectionService).select(null);
  });

  it('should read the acquisitions of the session company without a company parameter', () => {
    expect(component.canSelectCompany).toBeFalse();
    expect(getActiveCompaniesSpy).not.toHaveBeenCalled();
    expect(getAcquisitionsSpy).toHaveBeenCalledTimes(1);
    expect(getAcquisitionsSpy.calls.mostRecent().args[2]).toBeUndefined();
    expect(component.acquisitions().length).toBe(1);
  });

  it('should keep the subtitle and hide the company selector for a company session', () => {
    expect(fixture.nativeElement.querySelector('mat-select')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('ACQUISITIONS.SUBTITLE');
  });

  it('should leave the date range enabled for a company session', () => {
    expect(component.startDateControl.disabled).toBeFalse();
    expect(component.endDateControl.disabled).toBeFalse();
    const inputs = fixture.nativeElement.querySelectorAll('.filters input');
    inputs.forEach((input: HTMLInputElement) => expect(input.disabled).toBeFalse());
  });

  it('should reload the acquisitions when the date range changes', () => {
    const startDate = new Date('2026-09-01T07:00:00.000Z');
    const endDate = new Date('2026-09-30T23:59:59.000Z');
    component.startDateControl.setValue(startDate);
    component.endDateControl.setValue(endDate);

    expect(getAcquisitionsSpy).toHaveBeenCalledTimes(3);
    const args = getAcquisitionsSpy.calls.mostRecent().args;
    expect(args[0]?.toISOString()).toBe(startDate.toISOString());
    expect(args[1]?.toISOString()).toBe(endDate.toISOString());
    expect(args[2]).toBeUndefined();
  });

  it('should notify the error and clear the loading state when the read fails', () => {
    getAcquisitionsSpy.and.returnValue(throwError(() => ({ status: 500 })));
    component.loadAcquisitions();

    expect(errorSpy).toHaveBeenCalledWith(ACQUISITIONS_CONSTANTS.MESSAGES.ERROR_LOADING_ACQUISITIONS);
    expect(component.isLoading()).toBeFalse();
  });
});

describe('AcquisitionsComponent (root session)', () => {
  let component: AcquisitionsComponent;
  let fixture: ComponentFixture<AcquisitionsComponent>;
  let getAcquisitionsSpy: jasmine.Spy;
  let getActiveCompaniesSpy: jasmine.Spy;
  let errorSpy: jasmine.Spy;

  /**
   * Builds the component for a root session.
   *
   * @param selectedCompanyOid Company already selected on a previous page of the session.
   * @param companiesError When true the companies request fails.
   */
  function setup(selectedCompanyOid: string | null = null, companiesError = false): void {
    getAcquisitionsSpy = jasmine
      .createSpy('getAcquisitions')
      .and.returnValue(of({ status: 200, message: 'OK', data: acquisitionsData } as ApiResponse<Acquisition[]>));
    getActiveCompaniesSpy = jasmine
      .createSpy('getActiveCompanies')
      .and.returnValue(
        companiesError
          ? throwError(() => ({ status: 500 }))
          : of({ status: 200, message: 'OK', data: companiesData } as ApiResponse<Company[]>)
      );
    errorSpy = jasmine.createSpy('error');

    TestBed.configureTestingModule({
      imports: [AcquisitionsComponent],
      providers: [
        { provide: AcquisitionsService, useValue: { getAcquisitions: getAcquisitionsSpy } },
        { provide: CompaniesService, useValue: { getActiveCompanies: getActiveCompaniesSpy } },
        { provide: PermissionService, useValue: { isRoot: () => true, hasAccessByLink: () => of(true) } },
        { provide: NotificationService, useValue: { success: jasmine.createSpy('success'), error: errorSpy } },
        { provide: I18nService, useValue: { translate: (key: string) => key } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        provideAnimationsAsync()
      ]
    });

    TestBed.inject(CompanySelectionService).select(selectedCompanyOid);

    fixture = TestBed.createComponent(AcquisitionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.inject(CompanySelectionService).select(null);
  });

  it('should offer the company selector instead of the subtitle and load the companies', () => {
    setup();

    expect(component.canSelectCompany).toBeTrue();
    expect(getActiveCompaniesSpy).toHaveBeenCalled();
    expect(component.companies().length).toBe(2);
    expect(fixture.nativeElement.querySelector('mat-select')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('ACQUISITIONS.SUBTITLE');
  });

  it('should not read the acquisitions until a company is selected', () => {
    setup();

    expect(getAcquisitionsSpy).not.toHaveBeenCalled();
    expect(component.acquisitions()).toEqual([]);
  });

  it('should disable the date range and the creation until a company is selected', () => {
    setup();

    expect(component.isCompanyRequired()).toBeTrue();
    expect(component.startDateControl.disabled).toBeTrue();
    expect(component.endDateControl.disabled).toBeTrue();
    const inputs = fixture.nativeElement.querySelectorAll('.filters input');
    expect(inputs.length).toBe(2);
    inputs.forEach((input: HTMLInputElement) => expect(input.disabled).toBeTrue());

    const createButton: HTMLButtonElement = fixture.nativeElement.querySelector('.actions button');
    expect(createButton.disabled).toBeTrue();
  });

  it('should read the acquisitions of the selected company and share the selection', () => {
    setup();

    component.onCompanySelected('company-2');
    fixture.detectChanges();

    expect(getAcquisitionsSpy).toHaveBeenCalledTimes(1);
    expect(getAcquisitionsSpy.calls.mostRecent().args[2]).toBe('company-2');
    expect(component.acquisitions().length).toBe(1);
    expect(TestBed.inject(CompanySelectionService).companyOid()).toBe('company-2');
    expect(component.endDateControl.disabled).toBeFalse();

    const createButton: HTMLButtonElement = fixture.nativeElement.querySelector('.actions button');
    expect(createButton.disabled).toBeFalse();
  });

  it('should block the date range again and clear the results when the selection is cleared', () => {
    setup('company-2');

    expect(getAcquisitionsSpy).toHaveBeenCalledTimes(1);

    component.onCompanySelected(null);
    fixture.detectChanges();

    expect(component.acquisitions()).toEqual([]);
    expect(component.startDateControl.disabled).toBeTrue();
    expect(getAcquisitionsSpy).toHaveBeenCalledTimes(1);
  });

  it('should inherit the company selected on another page of the session', () => {
    setup('company-2');

    expect(component.companyOid()).toBe('company-2');
    expect(getAcquisitionsSpy.calls.mostRecent().args[2]).toBe('company-2');
    expect(component.startDateControl.disabled).toBeFalse();
  });

  it('should notify the error when the companies cannot be loaded', () => {
    setup(null, true);

    expect(errorSpy).toHaveBeenCalled();
    expect(component.companies()).toEqual([]);
  });
});
