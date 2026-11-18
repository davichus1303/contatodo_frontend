import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of } from 'rxjs';
import { DealDeleteDialogComponent, DealDeleteDialogData } from './deal-delete-dialog.component';
import { DealsService } from '@core/application/deals/deals.service';
import { NotificationService } from '@core/application/notifications/notification.service';
import { I18nService } from '@core/i18n/i18n.service';
import { Deal } from '@core/domain/models/deal.model';

describe('DealDeleteDialogComponent', () => {
  let component: DealDeleteDialogComponent;
  let fixture: ComponentFixture<DealDeleteDialogComponent>;
  let dealsServiceSpy: jasmine.SpyObj<DealsService>;
  let closeSpy: jasmine.Spy;

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

  beforeEach(() => {
    closeSpy = jasmine.createSpy('close');
    dealsServiceSpy = jasmine.createSpyObj<DealsService>('DealsService', ['deleteDeal']);
    dealsServiceSpy.deleteDeal.and.returnValue(of({ status: 200, message: 'ok', data: [] }));

    TestBed.configureTestingModule({
      imports: [DealDeleteDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { deal, productName: 'Product 1' } as DealDeleteDialogData },
        { provide: MatDialogRef, useValue: { close: closeSpy } },
        { provide: DealsService, useValue: dealsServiceSpy },
        { provide: I18nService, useValue: { translate: (key: string) => key } },
        { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['success', 'error']) },
        provideAnimationsAsync()
      ]
    });

    fixture = TestBed.createComponent(DealDeleteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should delete the deal and close the dialog with true', () => {
    component.confirm();

    expect(dealsServiceSpy.deleteDeal).toHaveBeenCalledWith('deal-1');
    expect(closeSpy).toHaveBeenCalledWith(true);
  });

  it('should close the dialog with false on cancel', () => {
    component.cancel();

    expect(closeSpy).toHaveBeenCalledWith(false);
    expect(dealsServiceSpy.deleteDeal).not.toHaveBeenCalled();
  });
});
