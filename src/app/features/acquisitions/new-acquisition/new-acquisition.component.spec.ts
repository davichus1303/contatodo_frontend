import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of, throwError } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { NewAcquisitionComponent } from './new-acquisition.component';
import { AcquisitionsService } from '@core/application/acquisitions/acquisitions.service';
import { ProductsService } from '@core/application/products/products.service';
import { AcquisitionTypeService } from '@core/application/acquisition-types/acquisition-type.service';
import { CompanySelectionService } from '@core/application/companies/company-selection.service';
import { NotificationService } from '@core/application/notifications/notification.service';
import { I18nService } from '@core/i18n/i18n.service';
import { Acquisition } from '@core/domain/models/acquisition.model';
import { ApiResponse } from '@core/application/ports/api-response.interface';
import { CreateAcquisitionRequest } from '@core/application/dto/acquisition-request.dto';
import { ACQUISITIONS_CONSTANTS } from '@shared/constants/acquisitions.constants';

const savedAcquisition: Acquisition = {
  id: 'a1',
  productName: 'Cemento',
  acquisitionType: 'Mercancia',
  quantity: 5,
  realCost: 100,
  unitRealCost: 20,
  unitPublicCost: 25,
  acquisitionDate: '2026-08-21T10:00:00'
};

const formModel = {
  acquisitionTypeOid: 'type-1',
  productSearchRaw: 'Cemento',
  isNewProduct: false,
  affectsInventory: true,
  quantity: 5,
  realCost: 100,
  unitPublicCost: 25,
  supplierName: null,
  invoiceNumber: null,
  observations: null,
  newProductDescription: null,
  newProductStock: null
};

describe('NewAcquisitionComponent', () => {
  let component: NewAcquisitionComponent;
  let fixture: ComponentFixture<NewAcquisitionComponent>;
  let getAllProductsSpy: jasmine.Spy;
  let createAcquisitionSpy: jasmine.Spy;
  let successSpy: jasmine.Spy;
  let errorSpy: jasmine.Spy;
  let dialogOpenSpy: jasmine.Spy;

  /**
   * Builds the container.
   *
   * @param selectedCompanyOid Company already selected on the acquisitions list.
   * @param confirmed Whether the confirmation dialog is accepted.
   * @param productsError When true the products request fails.
   */
  function setup(
    selectedCompanyOid: string | null = 'company-1',
    confirmed = true,
    productsError = false
  ): void {
    getAllProductsSpy = jasmine.createSpy('getAllProducts').and.returnValue(
      productsError
        ? throwError(() => ({ status: 500 }))
        : of({ status: 200, message: 'OK', data: [] } as ApiResponse<never[]>)
    );
    createAcquisitionSpy = jasmine.createSpy('createAcquisition').and.returnValue(
      of({ status: 201, message: 'OK', data: savedAcquisition } as ApiResponse<Acquisition>)
    );
    successSpy = jasmine.createSpy('success');
    errorSpy = jasmine.createSpy('error');
    dialogOpenSpy = jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(confirmed) });

    TestBed.configureTestingModule({
      imports: [NewAcquisitionComponent],
      providers: [
        {
          provide: AcquisitionsService,
          useValue: { getAcquisitions: jasmine.createSpy('getAcquisitions'), createAcquisition: createAcquisitionSpy }
        },
        { provide: ProductsService, useValue: { getAllProducts: getAllProductsSpy } },
        {
          provide: AcquisitionTypeService,
          useValue: {
            getAcquisitionTypes: jasmine
              .createSpy('getAcquisitionTypes')
              .and.returnValue(of({ status: 200, message: 'OK', data: [] }))
          }
        },
        { provide: NotificationService, useValue: { success: successSpy, error: errorSpy } },
        { provide: I18nService, useValue: { translate: (key: string) => key } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        provideAnimationsAsync()
      ]
    });
    TestBed.overrideComponent(NewAcquisitionComponent, {
      add: {
        providers: [{ provide: MatDialog, useValue: { open: dialogOpenSpy, closeAll: jasmine.createSpy('closeAll') } }]
      }
    });

    TestBed.inject(CompanySelectionService).select(selectedCompanyOid);

    fixture = TestBed.createComponent(NewAcquisitionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.inject(CompanySelectionService).select(null);
  });

  it('should load the products of the inherited company and offer no company selector', () => {
    setup('company-1');

    expect(getAllProductsSpy).toHaveBeenCalledWith('company-1');
    expect(fixture.nativeElement.querySelector('mat-select[aria-label*="COMPANY" i]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('ACQUISITIONS.SELECT_COMPANY');
  });

  it('should load the products of the session company when no selection was made', () => {
    setup(null);

    expect(getAllProductsSpy).toHaveBeenCalledWith(undefined);
  });

  it('should save the acquisition against the inherited company', () => {
    setup('company-1');

    component.onFormSave(formModel);

    expect(dialogOpenSpy).toHaveBeenCalled();
    expect(createAcquisitionSpy).toHaveBeenCalledTimes(1);
    const request = createAcquisitionSpy.calls.mostRecent().args[0] as CreateAcquisitionRequest;
    expect(request.companyOid).toBe('company-1');
    expect(request.acquisitionTypeOid).toBe('type-1');
    expect(successSpy).toHaveBeenCalledWith(ACQUISITIONS_CONSTANTS.MESSAGES.ACQUISITION_REGISTERED_SUCCESSFULLY);
  });

  it('should not save when the confirmation dialog is dismissed', () => {
    setup('company-1', false);

    component.onFormSave(formModel);

    expect(createAcquisitionSpy).not.toHaveBeenCalled();
  });

  it('should notify the error when the save fails', () => {
    setup('company-1');
    createAcquisitionSpy.and.returnValue(throwError(() => ({ status: 500 })));

    component.onFormSave(formModel);

    expect(errorSpy).toHaveBeenCalled();
    expect(component.isSaving()).toBeFalse();
  });

  it('should notify the error when the products cannot be loaded', () => {
    setup('company-1', true, true);

    expect(errorSpy).toHaveBeenCalledWith(ACQUISITIONS_CONSTANTS.MESSAGES.ERROR_LOADING_PRODUCTS);
  });
});
