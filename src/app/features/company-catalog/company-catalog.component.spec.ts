import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { CompanyCatalogComponent } from './company-catalog.component';
import { CompaniesService } from '@core/application/companies/companies.service';
import { NotificationService } from '@core/application/notifications/notification.service';
import { I18nService } from '@core/i18n/i18n.service';
import { Company } from '@core/domain/models/company.model';
import { ApiResponse } from '@core/application/ports/api-response.interface';

describe('CompanyCatalogComponent', () => {
  let component: CompanyCatalogComponent;
  let fixture: ComponentFixture<CompanyCatalogComponent>;
  let getCompaniesSpy: jasmine.Spy;
  let errorSpy: jasmine.Spy;
  let translateSpy: jasmine.Spy;

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
    errorSpy = jasmine.createSpy('error');
    translateSpy = jasmine.createSpy('translate').and.callFake((key: string) => key);

    TestBed.configureTestingModule({
      imports: [CompanyCatalogComponent],
      providers: [
        { provide: CompaniesService, useValue: { getCompanies: getCompaniesSpy } },
        { provide: NotificationService, useValue: { error: errorSpy } },
        { provide: I18nService, useValue: { translate: translateSpy } },
        provideAnimationsAsync()
      ]
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

  it('should render the create and card actions as disabled placeholders', () => {
    const createButton = fixture.nativeElement.querySelector('.page-header .actions button') as HTMLButtonElement;
    expect(createButton.disabled).toBeTrue();

    const cards = fixture.nativeElement.querySelectorAll('.company-card') as NodeListOf<HTMLElement>;
    expect(cards.length).toBe(2);
    cards.forEach((card) => {
      const actionButtons = card.querySelectorAll('.card-actions > button') as NodeListOf<HTMLButtonElement>;
      expect(actionButtons.length).toBe(2);
      actionButtons.forEach((button) => expect(button.disabled).toBeTrue());

      const switchButton = card.querySelector('.card-actions mat-slide-toggle button') as HTMLButtonElement;
      expect(switchButton.disabled).toBeTrue();
    });
  });

  it('should notify an error and stop loading when the request fails', () => {
    getCompaniesSpy.and.returnValue(throwError(() => ({ status: 500 })));

    component.loadCompanies();

    expect(errorSpy).toHaveBeenCalled();
    expect(component.isLoading()).toBeFalse();
  });
});
