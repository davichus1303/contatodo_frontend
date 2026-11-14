import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ADAPTER_PROVIDERS } from '@core/adapters/adapters.providers';
import { AcquisitionFormComponent } from './acquisition-form.component';
import { AcquisitionFormModel } from './acquisition-form.model';
import { Product } from '@core/domain/models/product.model';
import { AcquisitionType } from '@core/domain/models/acquisition-type.model';
import { UnitOfMeasure } from '@core/domain/models/unit-of-measure.model';

/**
 * Regression coverage for the product autocomplete in the acquisition form.
 *
 * Guards the split from `49adf81`: the container now owns product loading and
 * passes them down as inputs, but the form originally stopped populating its
 * autocomplete list, so existing products never showed up while typing.
 */
describe('AcquisitionFormComponent', () => {
  let component: AcquisitionFormComponent;
  let fixture: ComponentFixture<AcquisitionFormComponent>;
  let httpTesting: HttpTestingController;

  const sampleProducts: Product[] = [
    {
      id: '1',
      name: 'Ceviche',
      description: 'Fish dish',
      unitOfMeasures: ['uom-lt'],
      stock: 10,
      code: 'P001',
      realCost: 8,
      unitRealCost: 8,
      unitPublicCost: 15,
      urlPhoto: '',
      isActive: true, },
    {
      id: '2',
      name: 'Arroz con pollo',
      description: 'Rice with chicken',
      unitOfMeasures: ['uom-kg'],
      stock: 5,
      code: 'P002',
      realCost: 6,
      unitRealCost: 6,
      unitPublicCost: 12,
      urlPhoto: '',
      isActive: true, },
    {
      id: '3',
      name: 'Docena de empanadas',
      description: 'Pack of empanadas',
      unitOfMeasures: ['uom-doc'],
      packSize: 12,
      stock: 4,
      code: 'P003',
      realCost: 24,
      unitRealCost: 2,
      unitPublicCost: 3,
      urlPhoto: '',
      isActive: true, }
  ];

  const sampleUnits: UnitOfMeasure[] = [
    { id: 'uom-kg', name: 'Kilogramo', abrev: 'kg', isActive: true, isDeleted: false, isDivisible: true, isPack: false },
    { id: 'uom-lt', name: 'Litro', abrev: 'lt', isActive: true, isDeleted: false, isDivisible: true, isPack: false },
    { id: 'uom-doc', name: 'Docena', abrev: 'doc', isActive: true, isDeleted: false, isDivisible: false, isPack: true }
  ];

  const sampleAcquisitionTypes: AcquisitionType[] = [
    {
      id: 'mercancia',
      name: 'Mercancía',
      isActive: true,
      isDeleted: false,
      affectsInventory: true
    },
    {
      id: 'gasto',
      name: 'Gasto',
      isActive: true,
      isDeleted: false,
      affectsInventory: false
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcquisitionFormComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        ...ADAPTER_PROVIDERS
      ]
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AcquisitionFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('acquisitionTypes', sampleAcquisitionTypes);
    fixture.componentRef.setInput('products', sampleProducts);
    fixture.componentRef.setInput('units', sampleUnits);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTesting.match(() => true).forEach((request) => request.flush({}));
    httpTesting.verify();
  });

  /**
   * Selects an inventory-affecting acquisition type.
   */
  function selectInventoryType(): void {
    component.acquisitionForm.get('acquisitionTypeOid')?.setValue('mercancia');
    component.onAcquisitionTypeChange();
    fixture.detectChanges();
  }

  it('should expose the existing products to the autocomplete', () => {
    expect(component.filteredProducts().map((p: Product) => p.name)).toEqual([
      'Ceviche',
      'Arroz con pollo',
      'Docena de empanadas'
    ]);
    expect(component.filteredOptions().map((p: Product) => p.name)).toEqual([
      'Ceviche',
      'Arroz con pollo',
      'Docena de empanadas'
    ]);
  });

  it('should filter the autocomplete options while typing', () => {
    component.acquisitionForm.get('productSearch')?.setValue('cevi');
    fixture.detectChanges();

    expect(component.filteredOptions().map((p: Product) => p.name)).toEqual(['Ceviche']);
  });

  it('should keep showing the full list once the search is cleared', () => {
    component.acquisitionForm.get('productSearch')?.setValue('cevi');
    fixture.detectChanges();
    component.acquisitionForm.get('productSearch')?.setValue('');
    fixture.detectChanges();

    expect(component.filteredOptions().map((p: Product) => p.name)).toEqual([
      'Ceviche',
      'Arroz con pollo',
      'Docena de empanadas'
    ]);
  });

  it('should not flag an existing product as brand-new', () => {
    component.acquisitionForm.get('productSearch')?.setValue('ceviche');
    fixture.detectChanges();

    expect(component.isNewProduct()).toBeFalse();
  });

  it('should flag an unknown product as brand-new', () => {
    component.acquisitionForm.get('productSearch')?.setValue('producto inexistente');
    fixture.detectChanges();

    expect(component.isNewProduct()).toBeTrue();
  });

  it('should clear a selected product when switching to a non-inventory type', () => {
    component.acquisitionForm.get('acquisitionTypeOid')?.setValue('mercancia');
    component.onAcquisitionTypeChange();
    component.selectProduct(sampleProducts[0]);
    fixture.detectChanges();

    expect(component.acquisitionForm.get('productSearch')?.value).toEqual(sampleProducts[0]);

    component.acquisitionForm.get('acquisitionTypeOid')?.setValue('gasto');
    component.onAcquisitionTypeChange();
    fixture.detectChanges();

    expect(component.acquisitionForm.get('productSearch')?.value).toBe('');
    expect(component.selectedProduct()).toBeNull();
  });

  it('should reset the real cost and product when switching between inventory types', () => {
    const anotherInventoryType: AcquisitionType = {
      id: 'stock',
      name: 'Stock',
      isActive: true,
      isDeleted: false,
      affectsInventory: true
    };
    fixture.componentRef.setInput('acquisitionTypes', [...sampleAcquisitionTypes, anotherInventoryType]);
    fixture.detectChanges();

    component.acquisitionForm.get('acquisitionTypeOid')?.setValue('mercancia');
    component.onAcquisitionTypeChange();
    component.selectProduct(sampleProducts[0]);
    component.acquisitionForm.get('realCost')?.setValue(120);
    fixture.detectChanges();

    component.acquisitionForm.get('acquisitionTypeOid')?.setValue('stock');
    component.onAcquisitionTypeChange();
    fixture.detectChanges();

    expect(component.acquisitionForm.get('productSearch')?.value).toBe('');
    expect(component.selectedProduct()).toBeNull();
    expect(component.acquisitionForm.get('realCost')?.value).toBe(0);
    expect(component.acquisitionForm.get('unitPublicCost')?.value).toBe(0);
    expect(component.acquisitionForm.get('quantity')?.value).toBe(1);
  });

  it('should offer only the units declared by the selected existing product', () => {
    selectInventoryType();
    component.selectProduct(sampleProducts[0]);
    fixture.detectChanges();

    expect(component.availableAcquisitionUnits().map(unit => unit.id)).toEqual(['uom-lt']);
    expect(component.acquisitionForm.get('unitOfMeasure')?.value).toBe('uom-lt');
  });

  it('should not expose the pack size for an existing product', () => {
    selectInventoryType();
    component.selectProduct(sampleProducts[2]);
    fixture.detectChanges();

    expect(component.availableAcquisitionUnits().map(unit => unit.id)).toEqual(['uom-doc']);
    expect(component.hasPackUnitSelected()).toBeFalse();
    expect(component.acquisitionForm.get('packSize')?.value).toBeNull();
  });

  it('should emit only the acquisition unit for an existing product', () => {
    selectInventoryType();
    component.selectProduct(sampleProducts[0]);
    fixture.detectChanges();

    let emitted: AcquisitionFormModel | undefined;
    component.save.subscribe(model => (emitted = model));
    component.onSave();

    expect(emitted?.unitOfMeasures).toEqual([]);
    expect(emitted?.unitOfMeasure).toBe('uom-lt');
    expect(emitted?.packSize).toBeNull();
  });

  it('should offer the selected new-product units as acquisition units', () => {
    selectInventoryType();
    component.acquisitionForm.get('productSearch')?.setValue('Empanada nueva');
    fixture.detectChanges();

    expect(component.isNewProduct()).toBeTrue();
    expect(component.availableAcquisitionUnits()).toEqual([]);

    component.acquisitionForm.get('unitOfMeasures')?.setValue(['uom-kg', 'uom-doc']);
    fixture.detectChanges();

    expect(component.availableAcquisitionUnits().map(unit => unit.id)).toEqual(['uom-kg', 'uom-doc']);
    expect(component.hasPackUnitSelected()).toBeTrue();
    expect(component.acquisitionForm.get('packSize')?.invalid).toBeTrue();

    component.acquisitionForm.get('packSize')?.setValue(12);
    expect(component.acquisitionForm.get('packSize')?.valid).toBeTrue();
  });

  it('should emit the new-product units and pack size', () => {
    selectInventoryType();
    component.acquisitionForm.patchValue({
      productSearch: 'Empanada nueva',
      newProductStock: 10,
      realCost: 120,
      unitPublicCost: 5,
      unitOfMeasures: ['uom-doc'],
      unitOfMeasure: 'uom-doc',
      packSize: 12
    });
    fixture.detectChanges();

    let emitted: AcquisitionFormModel | undefined;
    component.save.subscribe(model => (emitted = model));
    component.onSave();

    expect(emitted?.isNewProduct).toBeTrue();
    expect(emitted?.unitOfMeasures).toEqual(['uom-doc']);
    expect(emitted?.unitOfMeasure).toBe('uom-doc');
    expect(emitted?.packSize).toBe(12);
  });

  it('should clear the pack size when no selected unit is a pack', () => {
    selectInventoryType();
    component.acquisitionForm.patchValue({
      productSearch: 'Empanada nueva',
      unitOfMeasures: ['uom-doc'],
      packSize: 12
    });

    component.acquisitionForm.get('unitOfMeasures')?.setValue(['uom-kg']);

    expect(component.hasPackUnitSelected()).toBeFalse();
    expect(component.acquisitionForm.get('packSize')?.value).toBeNull();
  });

  it('should offer the full active catalog for non-inventory acquisitions', () => {
    component.acquisitionForm.get('acquisitionTypeOid')?.setValue('gasto');
    component.onAcquisitionTypeChange();
    fixture.detectChanges();

    expect(component.availableAcquisitionUnits().map(unit => unit.id)).toEqual([
      'uom-doc',
      'uom-kg',
      'uom-lt'
    ]);
    expect(component.acquisitionForm.get('unitOfMeasure')?.invalid).toBeTrue();
  });

  it('should require the acquisition unit for non-inventory acquisitions', () => {
    component.acquisitionForm.get('acquisitionTypeOid')?.setValue('gasto');
    component.onAcquisitionTypeChange();
    component.acquisitionForm.patchValue({ productSearch: 'Renta', realCost: 100 });
    fixture.detectChanges();

    expect(component.canSaveAcquisition()).toBeFalse();

    component.acquisitionForm.get('unitOfMeasure')?.setValue('uom-kg');

    expect(component.canSaveAcquisition()).toBeTrue();
  });
});