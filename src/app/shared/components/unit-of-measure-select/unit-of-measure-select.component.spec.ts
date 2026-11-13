import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MatSelectChange } from '@angular/material/select';
import { UnitOfMeasureSelectComponent } from './unit-of-measure-select.component';
import { I18nService } from '@core/i18n/i18n.service';
import { UnitOfMeasure } from '@core/domain/models/unit-of-measure.model';

describe('UnitOfMeasureSelectComponent', () => {
  let component: UnitOfMeasureSelectComponent;
  let fixture: ComponentFixture<UnitOfMeasureSelectComponent>;

  const i18nMock = {
    translate: jasmine.createSpy('translate').and.callFake((key: string) => key)
  };

  const units: UnitOfMeasure[] = [
    { id: 'uom-lt', name: 'Litro', abrev: 'lt', isActive: true, isDeleted: false, isDivisible: true },
    { id: 'uom-kg', name: 'Kilogramo', abrev: 'kg', isActive: true, isDeleted: false, isDivisible: true }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnitOfMeasureSelectComponent],
      providers: [
        provideAnimationsAsync(),
        { provide: I18nService, useValue: i18nMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UnitOfMeasureSelectComponent);
    component = fixture.componentInstance;
    i18nMock.translate.calls.reset();
  });

  it('normalizes a single value and ignores empty values', () => {
    component.writeValue(' uom-lt ');
    expect(component.value()).toBe(' uom-lt ');

    component.writeValue('');
    expect(component.value()).toBeNull();
  });

  it('normalizes multiple values as a clean string array', () => {
    component.multiple = true;

    component.writeValue(['uom-lt', null, '', 'uom-kg']);

    expect(component.value()).toEqual(['uom-lt', 'uom-kg']);
  });

  it('emits the selected value and marks the control as touched', () => {
    const onChange = jasmine.createSpy('onChange');
    const onTouched = jasmine.createSpy('onTouched');
    component.registerOnChange(onChange);
    component.registerOnTouched(onTouched);

    component.onSelectionChange({ value: 'uom-lt' } as MatSelectChange);

    expect(component.value()).toBe('uom-lt');
    expect(onChange).toHaveBeenCalledWith('uom-lt');
    expect(onTouched).toHaveBeenCalled();
    expect(component.touched()).toBeTrue();
  });

  it('keeps multiple selection as an array when emitting', () => {
    component.multiple = true;
    const onChange = jasmine.createSpy('onChange');
    component.registerOnChange(onChange);

    component.onSelectionChange({ value: ['uom-lt', 'uom-kg'] } as MatSelectChange);

    expect(onChange).toHaveBeenCalledWith(['uom-lt', 'uom-kg']);
  });

  it('shows the required error only after being touched with no value', () => {
    component.required = true;
    component.touched.set(false);

    expect(component.showRequiredError).toBeFalse();

    component.markAsTouched();
    expect(component.showRequiredError).toBeTrue();

    component.writeValue('uom-lt');
    expect(component.showRequiredError).toBeFalse();
  });

  it('does not mark itself as touched while disabled', () => {
    const onTouched = jasmine.createSpy('onTouched');
    component.registerOnTouched(onTouched);
    component.setDisabledState(true);

    component.markAsTouched();

    expect(component.touched()).toBeFalse();
    expect(onTouched).not.toHaveBeenCalled();
  });

  it('sorts the available units by name without mutating the input', () => {
    component.units = units;

    const sorted = component.sortedUnits;

    expect(sorted.map((unit) => unit.name)).toEqual(['Kilogramo', 'Litro']);
    expect(units.map((unit) => unit.name)).toEqual(['Kilogramo', 'Litro']);
  });

  it('renders the localized fallback label and the empty hint', () => {
    fixture.detectChanges();

    const label = fixture.nativeElement.querySelector('mat-label');
    const content = fixture.nativeElement.textContent;

    expect(label?.textContent).toContain('UNIT_OF_MEASURE_CATALOG.SELECTOR.LABEL');
    expect(content).toContain('UNIT_OF_MEASURE_CATALOG.SELECTOR.EMPTY');
  });
});
