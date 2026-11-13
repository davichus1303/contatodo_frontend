import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ProductFormComponent } from './product-form.component';
import { UnitOfMeasureCatalogService } from '@core/application/unit-of-measures/unit-of-measure-catalog.service';
import { I18nService } from '@core/i18n/i18n.service';
import { Product } from '@core/domain/models/product.model';
import { UnitOfMeasure } from '@core/domain/models/unit-of-measure.model';

describe('ProductFormComponent', () => {
  let fixture: ComponentFixture<ProductFormComponent>;
  let component: ProductFormComponent;

  const units: UnitOfMeasure[] = [
    { id: 'uom-lt', name: 'Litro', abrev: 'lt', isActive: true, isDeleted: false, isDivisible: true, isPack: false },
    { id: 'uom-kg', name: 'Kilogramo', abrev: 'kg', isActive: true, isDeleted: false, isDivisible: true, isPack: false }
  ];

  const product: Product = {
    id: 'p1',
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

  const catalogMock = {
    getActiveUnits: jasmine.createSpy('getActiveUnits').and.returnValue(of(units))
  };
  const i18nMock = {
    translate: jasmine.createSpy('translate').and.callFake((key: string) => key)
  };
  const dialogRefMock = {
    close: jasmine.createSpy('close')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductFormComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: UnitOfMeasureCatalogService, useValue: catalogMock },
        { provide: I18nService, useValue: i18nMock },
        { provide: MatDialogRef, useValue: dialogRefMock }
      ]
    }).compileComponents();

    catalogMock.getActiveUnits.calls.reset();
    catalogMock.getActiveUnits.and.returnValue(of(units));
  });

  /**
   * Creates the form with the supplied product and edition state.
   *
   * @param currentProduct Product loaded in the dialog, if any.
   * @param isEdit Whether the form edits an existing product.
   */
  function createForm(currentProduct: Product | null, isEdit: boolean): void {
    fixture = TestBed.createComponent(ProductFormComponent);
    component = fixture.componentInstance;
    component.product = currentProduct;
    component.isEdit = isEdit;
    component.companyOid = 'company-1';
    fixture.detectChanges();
  }

  it('should load the active units for the company', () => {
    createForm(product, true);

    expect(catalogMock.getActiveUnits).toHaveBeenCalledWith('company-1');
    expect(component.units().map((unit) => unit.name)).toEqual(['Litro', 'Kilogramo']);
  });

  it('should initialize the selection with the units of the product', () => {
    createForm(product, true);

    expect(component.form()?.value.unitOfMeasures).toEqual(['uom-lt']);
  });

  it('should emit the selected units in the payload', () => {
    createForm(null, false);
    const form = component.form();
    form?.patchValue({
      name: 'Empanada',
      description: 'Baked pastry',
      unitOfMeasures: ['uom-lt', 'uom-kg'],
      stock: 5,
      realCost: 2,
      unitRealCost: 2,
      unitPublicCost: 6
    });

    spyOn(component.formSubmit, 'emit');
    component.submit();

    expect(component.formSubmit.emit).toHaveBeenCalledWith(
      jasmine.objectContaining({ unitOfMeasures: ['uom-lt', 'uom-kg'] })
    );
  });

  it('should not emit when the create form has no unit selected', () => {
    createForm(null, false);
    const form = component.form();
    form?.patchValue({
      name: 'Empanada',
      description: 'Baked pastry',
      unitOfMeasures: [],
      stock: 5,
      realCost: 2,
      unitRealCost: 2,
      unitPublicCost: 6
    });

    spyOn(component.formSubmit, 'emit');
    component.submit();

    expect(component.formSubmit.emit).not.toHaveBeenCalled();
    expect(form?.controls['unitOfMeasures'].invalid).toBeTrue();
  });
});
