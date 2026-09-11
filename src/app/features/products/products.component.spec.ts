import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ADAPTER_PROVIDERS } from '@core/adapters/adapters.providers';
import { ProductsComponent } from './products.component';
import { Product } from '@core/domain/models/product.model';
import { ApiResponse } from '@core/application/ports/api-response.interface';
import { PRODUCTS_URL } from '@core/config/api-routes.constants';

describe('ProductsComponent', () => {
  let component: ProductsComponent;
  let fixture: ComponentFixture<ProductsComponent>;
  let httpTesting: HttpTestingController;

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductsComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        ...ADAPTER_PROVIDERS
      ]
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProductsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTesting.match(() => true).forEach((request) => request.flush({}));
    httpTesting.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load products from the API on init', () => {
    const request = httpTesting.expectOne(PRODUCTS_URL);
    expect(request.request.method).toEqual('GET');

    const response: ApiResponse<Product[]> = {
      status: 200,
      message: 'OK',
      data: sampleProducts
    };
    request.flush(response);

    expect(component.products().length).toBe(2);
    expect(component.filteredProducts().length).toBe(2);
  });

  it('should filter products by search term', () => {
    flushSampleProducts();

    component.searchControl.setValue('ceviche');

    const visibleNames = component.filteredProducts().map((product: Product) => product.name);
    expect(visibleNames).toEqual(['Ceviche']);
  });

  it('should sort products by price ascending and toggle to descending', () => {
    flushSampleProducts();

    component.setSort('price');
    expect(component.filteredProducts()[0].name).toBe('Arroz con pollo');

    component.setSort('price');
    expect(component.filteredProducts()[0].name).toBe('Ceviche');
  });

  function flushSampleProducts(): void {
    const request = httpTesting.expectOne(PRODUCTS_URL);
    request.flush({
      status: 200,
      message: 'OK',
      data: sampleProducts
    } satisfies ApiResponse<Product[]>);
  }
});
