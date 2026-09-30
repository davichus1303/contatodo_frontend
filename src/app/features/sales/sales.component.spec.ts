import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { By } from '@angular/platform-browser';
import { MatSelect } from '@angular/material/select';
import { ADAPTER_PROVIDERS } from '@core/adapters/adapters.providers';
import { SalesComponent } from './sales.component';
import { PermissionService } from '@core/application/permissions/permission.service';
import { CompanySelectionService } from '@core/application/companies/company-selection.service';
import { ApiResponse } from '@core/application/ports/api-response.interface';
import { Product } from '@core/domain/models/product.model';
import { Company } from '@core/domain/models/company.model';

/**
 * Coverage for the root-only company selector on the sales page.
 *
 * A root session carries no company claim, so it must pick a company
 * explicitly before any product can be listed: the backend rejects an
 * unscoped read. Every other session is already scoped by its own token and
 * must neither see the selector nor send the parameter.
 */
describe('SalesComponent', () => {
  let component: SalesComponent;
  let fixture: ComponentFixture<SalesComponent>;
  let httpTesting: HttpTestingController;
  let isRoot: boolean;

  const sampleProducts: Product[] = [
    {
      id: 'product-1',
      name: 'Ceviche',
      description: 'Fish dish',
      stock: 10,
      code: 'P001',
      realCost: 8,
      unitRealCost: 8,
      unitPublicCost: 15,
      isActive: true,
      createdDate: '2026-01-01',
      updatedDate: '2026-01-01'
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
      imports: [SalesComponent],
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
    httpTesting.verify();
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(SalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function flushProducts(data: Product[]): void {
    const request = httpTesting.expectOne((req) => req.url.includes('/products/available'));
    request.flush({ status: 200, message: 'OK', data } satisfies ApiResponse<Product[]>);
    fixture.detectChanges();
  }

  function flushCompanies(data: Company[]): void {
    const request = httpTesting.expectOne((req) => req.url.endsWith('/companies/active'));
    request.flush({ status: 200, message: 'OK', data } satisfies ApiResponse<Company[]>);
    fixture.detectChanges();
  }

  describe('non-root session', () => {
    it('should load products on init without requesting the company catalog', () => {
      createComponent();

      const request = httpTesting.expectOne((req) => req.url.includes('/products/available'));
      expect(request.request.params.has('companyOid')).toBeFalse();
      expect(httpTesting.match((req) => req.url.endsWith('/companies/active')).length).toBe(0);
    });

    it('should not render the company selector', () => {
      createComponent();
      flushProducts(sampleProducts);

      expect(component.canSelectCompany).toBeFalse();
      expect(fixture.nativeElement.querySelector('.company-selector')).toBeNull();
    });
  });

  describe('root session', () => {
    beforeEach(() => {
      isRoot = true;
    });

    it('should request active companies and defer the product load until one is picked', () => {
      createComponent();

      const request = httpTesting.expectOne((req) => req.url.endsWith('/companies/active'));
      request.flush({
        status: 200,
        message: 'OK',
        data: sampleCompanies
      } satisfies ApiResponse<Company[]>);

      expect(httpTesting.match((req) => req.url.includes('/products/available')).length).toBe(0);
      expect(component.visibleProducts()).toEqual([]);
    });

    it('should render the selector and hold the active companies as its options', () => {
      createComponent();
      flushCompanies(sampleCompanies);

      expect(fixture.nativeElement.querySelector('.company-selector')).not.toBeNull();
      expect(component.companies().length).toBe(2);
      expect(component.companies()[0].name).toBe('Acme');
      expect(component.companies()[1].name).toBe('Globex');
    });

    it('should bind the selected company to the selector', () => {
      createComponent();
      flushCompanies(sampleCompanies);

      component.onCompanySelected('company-1');
      fixture.detectChanges();

      const select: MatSelect = fixture.debugElement
        .query(By.directive(MatSelect))
        .componentInstance;
      expect(select.value).toBe('company-1');
    });

    it('should reload products scoped to the selected company', () => {
      createComponent();
      flushCompanies(sampleCompanies);

      component.onCompanySelected('company-2');
      fixture.detectChanges();

      const request = httpTesting.expectOne((req) => req.url.includes('/products/available'));
      expect(request.request.params.get('companyOid')).toBe('company-2');
    });

    it('should show the products of the selected company', () => {
      createComponent();
      flushCompanies(sampleCompanies);

      component.onCompanySelected('company-1');
      fixture.detectChanges();
      flushProducts(sampleProducts);

      expect(component.visibleProducts().length).toBe(1);
      expect(component.visibleProducts()[0].name).toBe('Ceviche');
    });

    it('should inherit a previously selected company and load its products immediately', () => {
      TestBed.inject(CompanySelectionService).select('company-1');
      createComponent();

      expect(component.companyOid()).toBe('company-1');

      flushCompanies(sampleCompanies);

      const request = httpTesting.expectOne((req) => req.url.includes('/products/available'));
      expect(request.request.params.get('companyOid')).toBe('company-1');
    });

    it('should persist the selected company for the sales history to inherit', () => {
      createComponent();
      flushCompanies(sampleCompanies);

      component.onCompanySelected('company-2');
      fixture.detectChanges();

      expect(TestBed.inject(CompanySelectionService).companyOid()).toBe('company-2');
    });
  });
});
