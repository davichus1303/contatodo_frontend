import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of } from 'rxjs';
import { DealDialogComponent, DealDialogData } from './deal-dialog.component';
import { DealsService } from '@core/application/deals/deals.service';
import { NotificationService } from '@core/application/notifications/notification.service';
import { I18nService } from '@core/i18n/i18n.service';
import { PermissionService } from '@core/application/permissions/permission.service';
import { CompanySelectionService } from '@core/application/companies/company-selection.service';
import { Deal } from '@core/domain/models/deal.model';

describe('DealDialogComponent', () => {
  let component: DealDialogComponent;
  let fixture: ComponentFixture<DealDialogComponent>;
  let dealsServiceSpy: jasmine.SpyObj<DealsService>;
  let closeSpy: jasmine.Spy;

  const products = [
    {
      id: 'product-1',
      name: 'Product 1',
      description: 'Desc',
      unitOfMeasures: ['uom-1'],
      stock: 1,
      code: 'P1',
      realCost: 1,
      unitRealCost: 1,
      unitPublicCost: 2,
      isActive: true
    }
  ];

  const units = [
    { id: 'uom-1', name: 'Unit', abrev: 'u', isActive: true, isDeleted: false, isDivisible: false, isPack: false }
  ];

  const deal: Deal = {
    id: 'deal-1',
    productOid: 'product-1',
    unitOfMeasureOid: 'uom-1',
    quantity: 2.5,
    price: 120,
    companyOid: 'company-1',
    isActive: true,
    isDelete: false
  };

  function configure(data: DealDialogData, isRoot: boolean, selectedCompanyOid: string | null): void {
    TestBed.configureTestingModule({
      imports: [DealDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close: closeSpy } },
        { provide: I18nService, useValue: { translate: (key: string) => key } },
        { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['success', 'error']) },
        { provide: DealsService, useValue: dealsServiceSpy },
        { provide: PermissionService, useValue: { isRoot: () => isRoot } },
        { provide: CompanySelectionService, useValue: { companyOid: () => selectedCompanyOid } },
        provideAnimationsAsync()
      ]
    });

    fixture = TestBed.createComponent(DealDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    spyOn(MatDialog.prototype, 'open').and.returnValue({ afterClosed: () => of(true) } as never);
  }

  beforeEach(() => {
    closeSpy = jasmine.createSpy('close');
    dealsServiceSpy = jasmine.createSpyObj<DealsService>('DealsService', ['createDeal', 'updateDeal']);
    dealsServiceSpy.createDeal.and.returnValue(of({ status: 200, message: 'ok', data: deal }));
    dealsServiceSpy.updateDeal.and.returnValue(of({ status: 200, message: 'ok', data: deal }));
  });

  it('should create a deal for a root session using the selected company', () => {
    configure({ mode: 'create', products, units, companyOid: 'company-1' }, true, 'company-1');

    component.form.controls.productOid.setValue('product-1');
    component.form.controls.unitOfMeasureOid.setValue('uom-1');
    component.form.controls.quantity.setValue(3);
    component.form.controls.price.setValue(30);

    component.submit();

    expect(dealsServiceSpy.createDeal).toHaveBeenCalledWith({
      companyOid: 'company-1',
      productOid: 'product-1',
      unitOfMeasureOid: 'uom-1',
      quantity: 3,
      price: 30
    });
  });

  it('should update only quantity and price in edit mode', () => {
    configure({ mode: 'edit', deal, products, units, companyOid: 'company-1' }, true, 'company-1');

    component.form.controls.quantity.setValue(5.75);
    component.form.controls.price.setValue(70);

    component.submit();

    expect(dealsServiceSpy.updateDeal).toHaveBeenCalledWith('deal-1', {
      quantity: 5.75,
      price: 70
    });
  });
});
