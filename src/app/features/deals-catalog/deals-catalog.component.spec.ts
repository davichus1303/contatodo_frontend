import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { DealsCatalogComponent } from './deals-catalog.component';
import { DealsService } from '@core/application/deals/deals.service';
import { ProductsService } from '@core/application/products/products.service';
import { UnitOfMeasureCatalogService } from '@core/application/unit-of-measures/unit-of-measure-catalog.service';
import { CompaniesService } from '@core/application/companies/companies.service';
import { NotificationService } from '@core/application/notifications/notification.service';
import { I18nService } from '@core/i18n/i18n.service';
import { PermissionService } from '@core/application/permissions/permission.service';
import { CompanySelectionService } from '@core/application/companies/company-selection.service';
import { HTTP_PORT } from '@core/application/ports/http.port';
import { STORAGE_PORT } from '@core/application/ports/storage.port';
import { Deal } from '@core/domain/models/deal.model';

describe('DealsCatalogComponent', () => {
  let fixture: ComponentFixture<DealsCatalogComponent>;
  let component: DealsCatalogComponent;

  const deals: Deal[] = [
    {
      id: 'deal-1',
      productOid: 'product-1',
      unitOfMeasureOid: 'uom-1',
      quantity: 2.5,
      price: 120,
      companyOid: 'company-1',
      isActive: true,
      isDelete: false
    }
  ];

  const dealsServiceSpy = jasmine.createSpyObj<DealsService>('DealsService', ['getDeals', 'updateDeal', 'deleteDeal']);
  const productsServiceSpy = jasmine.createSpyObj<ProductsService>('ProductsService', ['getAllProducts']);
  const unitOfMeasureCatalogSpy = jasmine.createSpyObj<UnitOfMeasureCatalogService>('UnitOfMeasureCatalogService', ['getHistoricalUnits']);
  const companiesServiceSpy = jasmine.createSpyObj<CompaniesService>('CompaniesService', ['getActiveCompanies']);
  const notificationSpy = jasmine.createSpyObj<NotificationService>('NotificationService', ['success', 'error']);

  beforeEach(async () => {
    dealsServiceSpy.getDeals.calls.reset();
    productsServiceSpy.getAllProducts.calls.reset();
    unitOfMeasureCatalogSpy.getHistoricalUnits.calls.reset();
    companiesServiceSpy.getActiveCompanies.calls.reset();
    notificationSpy.success.calls.reset();
    notificationSpy.error.calls.reset();

    dealsServiceSpy.getDeals.and.returnValue(of({ status: 200, message: 'OK', data: deals }));
    productsServiceSpy.getAllProducts.and.returnValue(of({
      status: 200,
      message: 'OK',
      data: [{ id: 'product-1', name: 'Product 1', description: '', unitOfMeasures: ['uom-1'], stock: 1, code: 'P1', realCost: 1, unitRealCost: 1, unitPublicCost: 2, isActive: true }]
    }));
    unitOfMeasureCatalogSpy.getHistoricalUnits.and.returnValue(of([
      { id: 'uom-1', name: 'Unit', abrev: 'u', isActive: true, isDeleted: false, isDivisible: false, isPack: false }
    ]));
    companiesServiceSpy.getActiveCompanies.and.returnValue(of({ status: 200, message: 'OK', data: [] }));

    await TestBed.configureTestingModule({
      imports: [DealsCatalogComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: DealsService, useValue: dealsServiceSpy },
        { provide: ProductsService, useValue: productsServiceSpy },
        { provide: UnitOfMeasureCatalogService, useValue: unitOfMeasureCatalogSpy },
        { provide: CompaniesService, useValue: companiesServiceSpy },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: I18nService, useValue: { translate: (key: string) => key } },
        { provide: PermissionService, useValue: { isRoot: () => false, hasAccessByLink: () => of(true) } },
        { provide: CompanySelectionService, useValue: { companyOid: () => null, select: () => {} } },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(false) }) } },
        { provide: HTTP_PORT, useValue: { get: () => of({}), post: () => of({}), put: () => of({}), delete: () => of({}) } },
        { provide: STORAGE_PORT, useValue: { get: () => null, set: () => {}, remove: () => {} } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DealsCatalogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load deals for a non-root session', () => {
    expect(component).toBeTruthy();
    expect(dealsServiceSpy.getDeals).toHaveBeenCalled();
    expect(productsServiceSpy.getAllProducts).toHaveBeenCalled();
    expect(unitOfMeasureCatalogSpy.getHistoricalUnits).toHaveBeenCalled();
    expect(component.filteredDeals().length).toBe(1);
  });

  it('should resolve product and unit names for display', () => {
    const deal = component.filteredDeals()[0];
    expect(component.getProductName(deal.productOid)).toBe('Product 1');
    expect(component.getUnitName(deal.unitOfMeasureOid)).toBe('Unit (u)');
  });
});
