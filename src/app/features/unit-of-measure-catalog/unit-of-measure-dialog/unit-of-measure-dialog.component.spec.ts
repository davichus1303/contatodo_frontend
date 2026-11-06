import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of } from 'rxjs';
import { UnitOfMeasureDialogComponent, UnitOfMeasureDialogData } from './unit-of-measure-dialog.component';
import { I18nService } from '@core/i18n/i18n.service';
import { NotificationService } from '@core/application/notifications/notification.service';
import { UnitOfMeasureService } from '@core/application/unit-of-measures/unit-of-measure.service';
import { PermissionService } from '@core/application/permissions/permission.service';
import { CompanySelectionService } from '@core/application/companies/company-selection.service';
import { UnitOfMeasure } from '@core/domain/models/unit-of-measure.model';

describe('UnitOfMeasureDialogComponent', () => {
  let component: UnitOfMeasureDialogComponent;
  let fixture: ComponentFixture<UnitOfMeasureDialogComponent>;
  let unitOfMeasureServiceSpy: jasmine.SpyObj<UnitOfMeasureService>;
  let closeSpy: jasmine.Spy;

  const unit: UnitOfMeasure = {
    id: 'u1',
    name: 'Kilogram',
    abrev: 'kg',
    isActive: true,
    isDeleted: false,
    isDivisible: true,
    companyOid: 'company-1'
  };

  function configure(data: UnitOfMeasureDialogData, isRoot: boolean, selectedCompanyOid: string | null): void {
    TestBed.configureTestingModule({
      imports: [UnitOfMeasureDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close: closeSpy } },
        { provide: I18nService, useValue: { translate: (key: string) => key } },
        { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['success', 'error']) },
        { provide: UnitOfMeasureService, useValue: unitOfMeasureServiceSpy },
        { provide: PermissionService, useValue: { isRoot: () => isRoot } },
        { provide: CompanySelectionService, useValue: { companyOid: () => selectedCompanyOid } },
        provideAnimationsAsync()
      ]
    });

    fixture = TestBed.createComponent(UnitOfMeasureDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    spyOn(MatDialog.prototype, 'open').and.returnValue({ afterClosed: () => of(true) } as never);
  }

  beforeEach(() => {
    closeSpy = jasmine.createSpy('close');
    unitOfMeasureServiceSpy = jasmine.createSpyObj<UnitOfMeasureService>(
      'UnitOfMeasureService',
      ['createUnitOfMeasure', 'updateUnitOfMeasure']
    );
    unitOfMeasureServiceSpy.updateUnitOfMeasure.and.returnValue(of({ status: 200, message: 'ok', data: unit }));
    unitOfMeasureServiceSpy.createUnitOfMeasure.and.returnValue(of({ status: 200, message: 'ok', data: unit }));
  });

  describe('in edit mode', () => {
    it('should send the selected company so a root session can update the unit', () => {
      configure({ mode: 'edit', unit }, true, 'company-1');
      component.form.controls.name.setValue('  Kilogram  ');
      component.form.controls.abrev.setValue('  kg  ');

      component.submit();

      expect(unitOfMeasureServiceSpy.updateUnitOfMeasure)
        .toHaveBeenCalledWith('u1', { name: 'Kilogram', abrev: 'kg', isDivisible: true }, 'company-1');
    });

    it('should omit the company when the session already carries it', () => {
      configure({ mode: 'edit', unit }, false, null);
      component.form.controls.name.setValue('Kilogram');
      component.form.controls.abrev.setValue('kg');

      component.submit();

      expect(unitOfMeasureServiceSpy.updateUnitOfMeasure)
        .toHaveBeenCalledWith('u1', { name: 'Kilogram', abrev: 'kg', isDivisible: true }, undefined);
    });
  });

  describe('in create mode', () => {
    it('should send the divisible flag together with the selected company', () => {
      configure({ mode: 'create' }, true, 'company-1');
      component.form.controls.name.setValue('  Kilogram  ');
      component.form.controls.abrev.setValue('  kg  ');
      component.form.controls.isDivisible.setValue(true);

      component.submit();

      expect(unitOfMeasureServiceSpy.createUnitOfMeasure)
        .toHaveBeenCalledWith({
          name: 'Kilogram',
          abrev: 'kg',
          companyOid: 'company-1',
          isDivisible: true
        });
    });

    it('should default the divisible flag to false', () => {
      configure({ mode: 'create' }, false, null);
      component.form.controls.name.setValue('Kilogram');
      component.form.controls.abrev.setValue('kg');

      component.submit();

      expect(unitOfMeasureServiceSpy.createUnitOfMeasure)
        .toHaveBeenCalledWith({
          name: 'Kilogram',
          abrev: 'kg',
          companyOid: undefined,
          isDivisible: false
        });
    });
  });
});
