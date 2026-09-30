import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ADAPTER_PROVIDERS } from '@core/adapters/adapters.providers';
import { SalesHistoryComponent } from './sales-history.component';
import { PermissionService } from '@core/application/permissions/permission.service';
import { CompanySelectionService } from '@core/application/companies/company-selection.service';
import { Sale } from '@core/domain/models/sale.model';
import { Company } from '@core/domain/models/company.model';
import { ApiResponse } from '@core/application/ports/api-response.interface';

/**
 * Regression coverage for the sales history loading flow and the root-only
 * company selector.
 *
 * A root session carries no company claim, so it must pick a company before
 * the history can be queried: the backend rejects an unscoped read. Every
 * other session is already scoped by its own token and must neither see the
 * selector nor send the parameter.
 */
describe('SalesHistoryComponent', () => {
  let component: SalesHistoryComponent;
  let fixture: ComponentFixture<SalesHistoryComponent>;
  let httpTesting: HttpTestingController;
  let isRoot: boolean;

  const sampleSales: Sale[] = [
    {
      id: 'sale-1',
      saleNumber: 1,
      productOid: 'product-1',
      productName: 'Ceviche',
      userOid: 'user-1',
      quantity: 2,
      totalCost: 8,
      originalTotalPrice: 20,
      totalSalePrice: 18,
      saleDate: '2026-09-15T12:00:00.000',
      notes: '',
      createdDate: '2026-09-15T12:00:00.000',
      updatedDate: '2026-09-15T12:00:00.000'
    },
    {
      id: 'sale-2',
      saleNumber: 2,
      productOid: 'product-2',
      productName: 'Arroz con pollo',
      userOid: 'user-1',
      quantity: 1,
      totalCost: 6,
      originalTotalPrice: 12,
      totalSalePrice: 12,
      saleDate: '2026-09-15T13:00:00.000',
      notes: '',
      createdDate: '2026-09-15T13:00:00.000',
      updatedDate: '2026-09-15T13:00:00.000'
    }
  ];

  const sampleCompanies: Company[] = [
    { id: 'company-1', name: 'Acme', isActive: true, isDeleted: false },
    { id: 'company-2', name: 'Globex', isActive: true, isDeleted: false }
  ];

  const permissionMock = {
    isRoot: jasmine.createSpy('isRoot').and.callFake(() => isRoot)
  };

  beforeEach(async () => {
    isRoot = false;

    await TestBed.configureTestingModule({
      imports: [SalesHistoryComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        { provide: PermissionService, useValue: permissionMock },
        ...ADAPTER_PROVIDERS
      ]
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    TestBed.inject(CompanySelectionService).select(null);
  });

  afterEach(() => {
    httpTesting.match(() => true).forEach((request) => request.flush({}));
    httpTesting.match(() => true).forEach((request) => request.flush({}));
    httpTesting.verify();
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(SalesHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function flushSales(data: Sale[]): void {
    const request = httpTesting.expectOne((req) => req.url.includes('/date-range'));
    expect(request.request.method).toEqual('GET');
    request.flush({
      status: 200,
      message: 'OK',
      data
    } satisfies ApiResponse<Sale[]>);
    fixture.detectChanges();
  }

  function flushTotalExpenses(total: number): void {
    const request = httpTesting.expectOne((req) => req.url.includes('/total'));
    expect(request.request.method).toEqual('POST');
    request.flush({
      status: 200,
      message: 'OK',
      data: { total }
    } satisfies ApiResponse<{ total: number }>);
    fixture.detectChanges();
  }

  function flushCompanies(data: Company[]): void {
    const request = httpTesting.expectOne((req) => req.url.endsWith('/companies/active'));
    request.flush({ status: 200, message: 'OK', data } satisfies ApiResponse<Company[]>);
    fixture.detectChanges();
  }

  describe('non-root session', () => {
    it('should create', () => {
      createComponent();
      expect(component).toBeTruthy();
    });

    it('should request sales by date range on init without the company scope', () => {
      createComponent();

      const request = httpTesting.expectOne((req) => req.url.includes('/date-range'));
      expect(request.request.method).toEqual('GET');
      expect(request.request.urlWithParams).toMatch(/startDate=\d{4}-\d{2}-\d{2}/);
      expect(request.request.urlWithParams).toMatch(/endDate=\d{4}-\d{2}-\d{2}/);
      expect(request.request.params.has('companyOid')).toBeFalse();
      expect(httpTesting.match((req) => req.url.endsWith('/companies/active')).length).toBe(0);
    });

    it('should not render the company selector', () => {
      createComponent();
      flushSales([]);
      flushTotalExpenses(0);

      expect(component.canSelectCompany).toBeFalse();
      expect(fixture.nativeElement.querySelector('.company-selector')).toBeNull();
    });

    it('should render the sales grid once sales load (regression: isLoading signal mishandling)', () => {
      createComponent();
      flushSales(sampleSales);
      flushTotalExpenses(50);

      expect(component.sales().length).toBe(2);
      expect(component.filteredSales().length).toBe(2);
      expect(component.summary().totalSales).toBe(2);
      expect(component.summary().totalExpenses).toBe(50);

      const grid = fixture.nativeElement.querySelector('.sales-grid');
      expect(grid).toBeTruthy();
      expect(grid.textContent).toContain('Ceviche');
      expect(grid.textContent).toContain('Arroz con pollo');
    });

    it('should show the empty state when no sales exist for the range', () => {
      createComponent();
      flushSales([]);
      flushTotalExpenses(0);

      expect(component.filteredSales().length).toBe(0);
      expect(fixture.nativeElement.querySelector('.empty-state')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.sales-grid')).toBeFalsy();
    });

    it('should filter sales matching the search term', () => {
      createComponent();
      flushSales(sampleSales);
      flushTotalExpenses(50);

      component.searchControl.get('search')?.setValue('ceviche');
      fixture.detectChanges();

      const visibleNames = component.filteredSales().map((sale: Sale) => sale.productName);
      expect(visibleNames).toEqual(['Ceviche']);
    });
  });

  describe('root session', () => {
    beforeEach(() => {
      isRoot = true;
    });

    it('should request active companies and defer the sales load until one is picked', () => {
      createComponent();

      const request = httpTesting.expectOne((req) => req.url.endsWith('/companies/active'));
      request.flush({
        status: 200,
        message: 'OK',
        data: sampleCompanies
      } satisfies ApiResponse<Company[]>);

      expect(httpTesting.match((req) => req.url.includes('/date-range')).length).toBe(0);
      expect(component.companyOid()).toBeNull();
      expect(fixture.nativeElement.querySelector('.company-selector')).not.toBeNull();
    });

    it('should render the selector and hold the active companies as its options', () => {
      createComponent();
      flushCompanies(sampleCompanies);

      expect(fixture.nativeElement.querySelector('.company-selector')).not.toBeNull();
      expect(component.companies().length).toBe(2);
      expect(component.companies()[0].name).toBe('Acme');
    });

    it('should show the "select a company" prompt before any company is chosen', () => {
      createComponent();
      flushCompanies(sampleCompanies);

      const prompt = fixture.nativeElement.querySelector('.empty-state');
      expect(prompt).toBeTruthy();
      expect(prompt.textContent).toContain('selectCompanyPrompt');
    });

    it('should reload the sales history scoped to the selected company', () => {
      createComponent();
      flushCompanies(sampleCompanies);

      component.onCompanySelected('company-2');
      fixture.detectChanges();

      const request = httpTesting.expectOne((req) => req.url.includes('/date-range'));
      expect(request.request.params.get('companyOid')).toBe('company-2');
    });

    it('should inherit the company selected in /sales and load the history right away', () => {
      TestBed.inject(CompanySelectionService).select('company-1');
      createComponent();

      flushCompanies(sampleCompanies);

      const request = httpTesting.expectOne((req) => req.url.includes('/date-range'));
      expect(request.request.params.get('companyOid')).toBe('company-1');
    });

    it('should persist a company chosen in the history for the sales page to inherit', () => {
      createComponent();
      flushCompanies(sampleCompanies);

      component.onCompanySelected('company-1');
      fixture.detectChanges();

      expect(TestBed.inject(CompanySelectionService).companyOid()).toBe('company-1');
    });
  });
});