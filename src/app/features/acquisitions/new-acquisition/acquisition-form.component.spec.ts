import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ADAPTER_PROVIDERS } from '@core/adapters/adapters.providers';
import { AcquisitionFormComponent } from './acquisition-form.component';
import { Product } from '@core/domain/models/product.model';
import { AcquisitionType } from '@core/domain/models/acquisition-type.model';

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
      stock: 10,
      code: 'P001',
      realCost: 8,
      unitRealCost: 8,
      unitPublicCost: 15,
      urlPhoto: '',
      isActive: true,
      createdDate: '2026-01-01',
      updatedDate: '2026-01-01'
    },
    {
      id: '2',
      name: 'Arroz con pollo',
      description: 'Rice with chicken',
      stock: 5,
      code: 'P002',
      realCost: 6,
      unitRealCost: 6,
      unitPublicCost: 12,
      urlPhoto: '',
      isActive: true,
      createdDate: '2026-01-01',
      updatedDate: '2026-01-01'
    }
  ];

  const sampleAcquisitionTypes: AcquisitionType[] = [
    {
      id: 'mercancia',
      name: 'Mercancía',
      isActive: true,
      isDeleted: false,
      affectsInventory: true
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
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTesting.match(() => true).forEach((request) => request.flush({}));
    httpTesting.verify();
  });

  it('should expose the existing products to the autocomplete', () => {
    expect(component.filteredProducts().map((p: Product) => p.name)).toEqual([
      'Ceviche',
      'Arroz con pollo'
    ]);
    expect(component.filteredOptions().map((p: Product) => p.name)).toEqual([
      'Ceviche',
      'Arroz con pollo'
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
      'Arroz con pollo'
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
});