import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ADAPTER_PROVIDERS } from '@core/adapters/adapters.providers';
import { SaleDialogComponent, SaleDialogData } from './sale-dialog.component';
import { Product } from '@core/domain/models/product.model';

/**
 * Coverage for the sale creation request.
 *
 * A root session carries no company claim, so the company chosen in the sales
 * page must travel with the request body or the sale is persisted without an
 * owner. This suite pins that the identifier is forwarded verbatim, and that a
 * sale that cannot generate profit is never submitted.
 */
describe('SaleDialogComponent', () => {
  let component: SaleDialogComponent;
  let fixture: ComponentFixture<SaleDialogComponent>;
  let httpTesting: HttpTestingController;

  const product: Product = {
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
  };

  function build(data: SaleDialogData): void {
    TestBed.configureTestingModule({
      imports: [SaleDialogComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
        ...ADAPTER_PROVIDERS
      ]
    });

    fixture = TestBed.createComponent(SaleDialogComponent);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  }

  afterEach(() => {
    httpTesting.match(() => true).forEach((request) => request.flush({}));
    httpTesting.verify();
  });

  function fillValidSale(totalSalePrice: number): void {
    component.saleForm.patchValue({ quantity: 2, totalSalePrice });
  }

  it('should send the selected companyOid in the request body', () => {
    build({ product, companyOid: 'company-9' });

    fillValidSale(100);
    component.onSave();
    fixture.detectChanges();

    const request = httpTesting.expectOne((req) => req.url.endsWith('/sales'));
    expect(request.request.method).toEqual('POST');
    expect(request.request.body.companyOid).toBe('company-9');
  });

  it('should omit companyOid when the session is already scoped', () => {
    build({ product, companyOid: null });

    fillValidSale(100);
    component.onSave();
    fixture.detectChanges();

    const request = httpTesting.expectOne((req) => req.url.endsWith('/sales'));
    expect(request.request.body.companyOid).toBeUndefined();
  });

  it('should not submit a sale that does not generate profit', () => {
    build({ product, companyOid: 'company-9' });

    // Cost is 8 x 2, so 16 is break-even and the backend rejects it.
    fillValidSale(16);
    component.onSave();
    fixture.detectChanges();

    expect(httpTesting.match((req) => req.url.endsWith('/sales')).length).toBe(0);
  });

  it('should submit a sale that generates profit', () => {
    build({ product, companyOid: 'company-9' });

    fillValidSale(20);
    component.onSave();
    fixture.detectChanges();

    const request = httpTesting.expectOne((req) => req.url.endsWith('/sales'));
    expect(request.request.body.totalSalePrice).toBe(20);
  });
});
