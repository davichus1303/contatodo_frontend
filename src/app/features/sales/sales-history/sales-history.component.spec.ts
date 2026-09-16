import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ADAPTER_PROVIDERS } from '@core/adapters/adapters.providers';
import { SalesHistoryComponent } from './sales-history.component';
import { Sale } from '@core/domain/models/sale.model';
import { ApiResponse } from '@core/application/ports/api-response.interface';

/**
 * Regression coverage for the sales history loading flow.
 *
 * Guards the template conditionals that hide the sales grid: `isLoading` is a
 * signal and must be invoked (`isLoading()`); previously the `*ngIf` blocks
 * read `!isLoading`, which is always `false`, so no sale was ever rendered.
 */
describe('SalesHistoryComponent', () => {
  let component: SalesHistoryComponent;
  let fixture: ComponentFixture<SalesHistoryComponent>;
  let httpTesting: HttpTestingController;

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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesHistoryComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        ...ADAPTER_PROVIDERS
      ]
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SalesHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTesting.match(() => true).forEach((request) => request.flush({}));
    httpTesting.match(() => true).forEach((request) => request.flush({}));
    httpTesting.verify();
  });

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

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should request sales by date range on init', () => {
    const request = httpTesting.expectOne((req) => req.url.includes('/date-range'));
    expect(request.request.method).toEqual('GET');
    expect(request.request.urlWithParams).toMatch(/startDate=\d{4}-\d{2}-\d{2}/);
    expect(request.request.urlWithParams).toMatch(/endDate=\d{4}-\d{2}-\d{2}/);
  });

  it('should render the sales grid once sales load (regression: isLoading signal mishandling)', () => {
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
    flushSales([]);
    flushTotalExpenses(0);

    expect(component.filteredSales().length).toBe(0);
    expect(fixture.nativeElement.querySelector('.empty-state')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.sales-grid')).toBeFalsy();
  });

  it('should filter sales matching the search term', () => {
    flushSales(sampleSales);
    flushTotalExpenses(50);

    component.searchControl.get('search')?.setValue('ceviche');
    fixture.detectChanges();

    const visibleNames = component.filteredSales().map((sale: Sale) => sale.productName);
    expect(visibleNames).toEqual(['Ceviche']);
  });
});