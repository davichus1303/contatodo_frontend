import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ADAPTER_PROVIDERS } from '@core/adapters/adapters.providers';
import { SaleDialogComponent, SaleDialogData } from './sale-dialog.component';
import { Product } from '@core/domain/models/product.model';
import { UnitOfMeasure } from '@core/domain/models/unit-of-measure.model';

/**
 * Coverage for the sale creation request.
 *
 * The dialog preselects the unit of measure of the product, preferring a
 * non-pack unit, and forwards the selected unit plus its pack flag so the
 * backend can convert pack quantities to base units. A root session carries no
 * company claim, so the company chosen in the sales page must travel with the
 * request body or the sale is persisted without an owner. This suite pins that
 * identifier, the unit contract and the profit/stock invariants.
 */
describe('SaleDialogComponent', () => {
  let component: SaleDialogComponent;
  let fixture: ComponentFixture<SaleDialogComponent>;
  let httpTesting: HttpTestingController;

  const sampleUnits: UnitOfMeasure[] = [
    { id: 'uom-kg', name: 'Kilogramo', abrev: 'kg', isActive: true, isDeleted: false, isDivisible: true, isPack: false },
    { id: 'uom-lt', name: 'Litro', abrev: 'lt', isActive: true, isDeleted: false, isDivisible: true, isPack: false },
    { id: 'uom-doc', name: 'Docena', abrev: 'doc', isActive: true, isDeleted: false, isDivisible: false, isPack: true }
  ];

  const product: Product = {
    id: 'product-1',
    name: 'Ceviche',
    description: 'Fish dish',
    unitOfMeasures: ['uom-lt'],
    stock: 10,
    code: 'P001',
    realCost: 8,
    unitRealCost: 8,
    unitPublicCost: 15,
    isActive: true
  };

  const packProduct: Product = {
    id: 'product-2',
    name: 'Docena de empanadas',
    description: 'Pack of empanadas',
    unitOfMeasures: ['uom-doc'],
    packSize: 12,
    stock: 24,
    code: 'P002',
    realCost: 24,
    unitRealCost: 2,
    unitPublicCost: 3,
    isActive: true
  };

  const multiUnitProduct: Product = {
    id: 'product-3',
    name: 'Arroz',
    description: 'Rice',
    unitOfMeasures: ['uom-doc', 'uom-kg'],
    packSize: 12,
    stock: 24,
    code: 'P003',
    realCost: 24,
    unitRealCost: 2,
    unitPublicCost: 3,
    isActive: true
  };

  const noUnitsProduct: Product = {
    id: 'product-4',
    name: 'Agua',
    description: 'Bottled water',
    unitOfMeasures: [],
    stock: 20,
    code: 'P004',
    realCost: 10,
    unitRealCost: 10,
    unitPublicCost: 15,
    isActive: true
  };

  const packOnlyUnits: UnitOfMeasure[] = [
    { id: 'uom-caja', name: 'Caja', abrev: 'cja', isActive: true, isDeleted: false, isDivisible: false, isPack: true },
    { id: 'uom-doc', name: 'Docena', abrev: 'doc', isActive: true, isDeleted: false, isDivisible: false, isPack: true }
  ];

  const packOnlyProduct: Product = {
    id: 'product-5',
    name: 'Cajas de empanadas',
    description: 'Pack-only product',
    unitOfMeasures: ['uom-doc', 'uom-caja'],
    packSize: 12,
    stock: 24,
    code: 'P005',
    realCost: 24,
    unitRealCost: 2,
    unitPublicCost: 3,
    isActive: true
  };

  function build(data: SaleDialogData, units: UnitOfMeasure[] = sampleUnits): void {
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

    const unitsRequest = httpTesting.expectOne((req) => req.url.endsWith('/units-of-measure'));
    unitsRequest.flush({ status: 200, message: 'OK', data: units });
    fixture.detectChanges();
  }

  afterEach(() => {
    httpTesting.match(() => true).forEach((request) => request.flush({}));
    httpTesting.verify();
  });

  function fillValidSale(totalSalePrice: number): void {
    component.saleForm.patchValue({ quantity: 2, totalSalePrice });
  }

  it('should preselect the non-pack unit when the product declares several', () => {
    build({ product: multiUnitProduct, companyOid: 'company-9' });

    expect(component.availableUnits().map(unit => unit.id)).toEqual(['uom-doc', 'uom-kg']);
    expect(component.saleForm.get('unitOfMeasureOid')?.value).toBe('uom-kg');
  });

  it('should preselect the only unit declared by the product', () => {
    build({ product: packProduct, companyOid: 'company-9' });

    expect(component.saleForm.get('unitOfMeasureOid')?.value).toBe('uom-doc');
    expect(component.isPackSelected()).toBeTrue();
  });

  it('should preselect the first unit when every option is a pack', () => {
    build({ product: packOnlyProduct, companyOid: 'company-9' }, packOnlyUnits);

    expect(component.availableUnits().map(unit => unit.id)).toEqual(['uom-caja', 'uom-doc']);
    expect(component.saleForm.get('unitOfMeasureOid')?.value).toBe('uom-caja');
    expect(component.isPackSelected()).toBeTrue();
  });

  it('should fall back to the full active catalog when the product declares no units', () => {
    build({ product: noUnitsProduct, companyOid: 'company-9' });

    expect(component.availableUnits().map(unit => unit.id)).toEqual([
      'uom-doc',
      'uom-kg',
      'uom-lt'
    ]);
    expect(component.saleForm.get('unitOfMeasureOid')?.value).toBe('uom-kg');
  });

  it('should send the selected unit and pack flag in the request body', () => {
    build({ product, companyOid: 'company-9' });

    fillValidSale(100);
    component.onSave();
    fixture.detectChanges();

    const request = httpTesting.expectOne((req) => req.url.endsWith('/sales'));
    expect(request.request.method).toEqual('POST');
    expect(request.request.body.unitOfMeasureOid).toBe('uom-lt');
    expect(request.request.body.isPack).toBeFalse();
    expect(request.request.body.packSize).toBeUndefined();
  });

  it('should calculate cost and profit in base units for a pack unit', () => {
    build({ product: packProduct, companyOid: 'company-9' });

    component.saleForm.patchValue({ quantity: 2, totalSalePrice: 60 });
    fixture.detectChanges();

    expect(component.baseQuantity()).toBe(24);
    expect(component.totalCost()).toBe(48);
    expect(component.profit()).toBe(12);
  });

  it('should send the pack flag without overriding the stored pack size', () => {
    build({ product: packProduct, companyOid: 'company-9' });

    component.saleForm.patchValue({ quantity: 2, totalSalePrice: 60 });
    component.onSave();
    fixture.detectChanges();

    const request = httpTesting.expectOne((req) => req.url.endsWith('/sales'));
    expect(request.request.body.unitOfMeasureOid).toBe('uom-doc');
    expect(request.request.body.isPack).toBeTrue();
    expect(request.request.body.quantity).toBe(2);
    expect(request.request.body.packSize).toBeUndefined();
  });

  it('should not submit a pack sale whose quantity exceeds the available packs', () => {
    build({ product: packProduct, companyOid: 'company-9' });

    component.saleForm.patchValue({ quantity: 3, totalSalePrice: 100 });
    fixture.detectChanges();

    expect(component.saleForm.get('quantity')?.hasError('insufficientStock')).toBeTrue();

    component.onSave();
    fixture.detectChanges();

    expect(httpTesting.match((req) => req.url.endsWith('/sales')).length).toBe(0);
  });

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
