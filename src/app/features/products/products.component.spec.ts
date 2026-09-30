import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { By } from '@angular/platform-browser';
import { EventEmitter } from '@angular/core';
import { of } from 'rxjs';
import { MatSelect } from '@angular/material/select';
import { ADAPTER_PROVIDERS } from '@core/adapters/adapters.providers';
import { ProductsComponent } from './products.component';
import { PermissionService } from '@core/application/permissions/permission.service';
import { CompanySelectionService } from '@core/application/companies/company-selection.service';
import { ProductFormPayload } from '@core/application/dto/product-request.dto';
import { Product } from '@core/domain/models/product.model';
import { Company } from '@core/domain/models/company.model';
import { ApiResponse } from '@core/application/ports/api-response.interface';
import { PRODUCTS_URL } from '@core/config/api-routes.constants';

/**
 * Coverage for the root-only company selector on the products page.
 *
 * A root session carries no company claim, so it must pick a company
 * explicitly before any product can be listed: the backend rejects an
 * unscoped read. Every other session is already scoped by its own token and
 * must neither see the selector nor send the parameter.
 */
describe('ProductsComponent', () => {
  let component: ProductsComponent;
  let fixture: ComponentFixture<ProductsComponent>;
  let httpTesting: HttpTestingController;
  let isRoot: boolean;

  const sampleProducts: Product[] = [
    {
      id: '1',
      name: 'Ceviche',
      description: 'Fish dish',
      stock: 10,
      code: 'P001',
      realCost: 8,
      unitRealCost: 8,
      unitPublicCost: 15,
      urlPhoto: '',
      isActive: true,
      createdDate: '2026-01-01',
      updatedDate: '2026-01-01'
    },
    {
      id: '2',
      name: 'Arroz con pollo',
      description: 'Rice with chicken',
      stock: 0,
      code: 'P002',
      realCost: 6,
      unitRealCost: 6,
      unitPublicCost: 12,
      urlPhoto: '',
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
    isRoot: jasmine.createSpy('isRoot').and.callFake(() => isRoot),
    hasAccessByLink: jasmine.createSpy('hasAccessByLink').and.returnValue(of(true))
  };

  beforeEach(async () => {
    isRoot = false;

    await TestBed.configureTestingModule({
      imports: [ProductsComponent],
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
    fixture = TestBed.createComponent(ProductsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function flushProducts(data: Product[]): void {
    const request = httpTesting.expectOne(
      (req) => req.method === 'GET' && req.url.includes(PRODUCTS_URL) && !req.url.includes('available')
    );
    expect(request.request.params.get('companyOid')).toBe(component.companyOid());
    request.flush({ status: 200, message: 'OK', data } satisfies ApiResponse<Product[]>);
    fixture.detectChanges();
  }

  function flushCompanies(data: Company[]): void {
    const request = httpTesting.expectOne((req) => req.url.endsWith('/companies/active'));
    request.flush({ status: 200, message: 'OK', data } satisfies ApiResponse<Company[]>);
    fixture.detectChanges();
  }

  it('should create', () => {
    createComponent();

    expect(component).toBeTruthy();
  });

  describe('non-root session', () => {
    it('should load products on init without requesting the company catalog', () => {
      createComponent();

      const request = httpTesting.expectOne(
        (req) => req.method === 'GET' && req.url.includes(PRODUCTS_URL) && !req.url.includes('available')
      );
      expect(request.request.url).toBe(PRODUCTS_URL);
      expect(httpTesting.match((req) => req.url.endsWith('/companies/active')).length).toBe(0);

      request.flush({ status: 200, message: 'OK', data: sampleProducts } satisfies ApiResponse<Product[]>);
      fixture.detectChanges();

      expect(component.products().length).toBe(2);
      expect(component.filteredProducts().length).toBe(2);
    });

    it('should not render the company selector', () => {
      createComponent();
      flushProducts(sampleProducts);

      expect(component.canSelectCompany).toBeFalse();
      expect(fixture.nativeElement.querySelector('.company-selector')).toBeNull();
    });

    it('should filter products by search term', () => {
      createComponent();
      flushProducts(sampleProducts);

      component.searchControl.setValue('ceviche');

      const visibleNames = component.filteredProducts().map((product: Product) => product.name);
      expect(visibleNames).toEqual(['Ceviche']);
    });

    it('should sort products by price ascending and toggle to descending', () => {
      createComponent();
      flushProducts(sampleProducts);

      component.setSort('price');
      expect(component.filteredProducts()[0].name).toBe('Arroz con pollo');

      component.setSort('price');
      expect(component.filteredProducts()[0].name).toBe('Ceviche');
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

      expect(
        httpTesting.match((req) => req.method === 'GET' && req.url.includes(PRODUCTS_URL) && !req.url.includes('available')).length
      ).toBe(0);
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
      flushProducts(sampleProducts);

      expect(component.visibleProducts().length).toBe(2);
    });

    it('should show the products of the selected company only', () => {
      createComponent();
      flushCompanies(sampleCompanies);
      component.onCompanySelected('company-1');
      fixture.detectChanges();
      flushProducts(sampleProducts);

      expect(component.visibleProducts().length).toBe(2);
      expect(component.visibleProducts()[0].name).toBe('Arroz con pollo');
      expect(component.visibleProducts()[1].name).toBe('Ceviche');
    });

    it('should inherit a previously selected company and load its products immediately', () => {
      TestBed.inject(CompanySelectionService).select('company-1');
      createComponent();

      expect(component.companyOid()).toBe('company-1');

      flushCompanies(sampleCompanies);
      flushProducts(sampleProducts);

      expect(component.visibleProducts().length).toBe(2);
    });

    it('should persist the selected company for the other pages to inherit', () => {
      createComponent();
      flushCompanies(sampleCompanies);

      component.onCompanySelected('company-2');
      fixture.detectChanges();

      expect(TestBed.inject(CompanySelectionService).companyOid()).toBe('company-2');
    });

    it('should send the selected company when creating a product', () => {
      createComponent();
      flushCompanies(sampleCompanies);
      component.onCompanySelected('company-1');
      fixture.detectChanges();
      flushProducts(sampleProducts);

      const formSubmit = new EventEmitter<ProductFormPayload>();
      spyOn(component['dialog'], 'open').and.returnValue({
        componentInstance: { formSubmit }
      } as never);

      component.openCreateDialog();
      formSubmit.emit({
        name: 'Empanada',
        description: 'Baked pastry',
        stock: 5,
        realCost: 2,
        unitRealCost: 2,
        unitPublicCost: 6
      });

      const request = httpTesting.expectOne((req) => req.method === 'POST' && req.url.includes(PRODUCTS_URL));
      expect(request.request.body.companyOid).toBe('company-1');
      request.flush({ status: 200, message: 'OK', data: sampleProducts[0] } satisfies ApiResponse<Product>);
      fixture.detectChanges();
    });

    it('should update a product of the selected company without leaking the company', () => {
      createComponent();
      flushCompanies(sampleCompanies);
      component.onCompanySelected('company-1');
      fixture.detectChanges();
      flushProducts(sampleProducts);

      const formSubmit = new EventEmitter<ProductFormPayload>();
      spyOn(component['dialog'], 'open').and.returnValue({
        componentInstance: { formSubmit },
        afterClosed: () => of(true)
      } as never);

      component.openEditDialog(sampleProducts[0]);
      formSubmit.emit({
        name: 'Ceviche',
        description: 'Fish dish',
        stock: 9,
        realCost: 8,
        unitRealCost: 8,
        unitPublicCost: 15
      });

      const request = httpTesting.expectOne((req) => req.method === 'PUT' && req.url.includes(`/products/${sampleProducts[0].id}`));
      expect(request.request.body.companyOid).toBeUndefined();
      request.flush({ status: 200, message: 'OK', data: sampleProducts[0] } satisfies ApiResponse<Product>);
      fixture.detectChanges();
    });
  });
});