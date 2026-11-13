import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UnitOfMeasureCatalogService } from './unit-of-measure-catalog.service';
import { UnitOfMeasureService } from './unit-of-measure.service';

describe('UnitOfMeasureCatalogService', () => {
  let service: UnitOfMeasureCatalogService;

  const unitOfMeasureServiceMock = {
    getUnitOfMeasures: jasmine.createSpy('getUnitOfMeasures'),
    getAllNotDeletedUnitOfMeasures: jasmine.createSpy('getAllNotDeletedUnitOfMeasures'),
    invalidateCache: jasmine.createSpy('invalidateCache')
  };

  const activeResponse = {
    status: 200,
    message: 'OK',
    data: [
      { id: 'uom-1', name: 'Litro', abrev: 'lt', isActive: true, isDeleted: false, isDivisible: true, isPack: false },
      { id: 'uom-2', name: 'Kilogramo', abrev: 'kg', isActive: true, isDeleted: false, isDivisible: true, isPack: false }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: UnitOfMeasureService, useValue: unitOfMeasureServiceMock }]
    });
    service = TestBed.inject(UnitOfMeasureCatalogService);

    unitOfMeasureServiceMock.getUnitOfMeasures.calls.reset();
    unitOfMeasureServiceMock.getAllNotDeletedUnitOfMeasures.calls.reset();
    unitOfMeasureServiceMock.invalidateCache.calls.reset();
    unitOfMeasureServiceMock.getUnitOfMeasures.and.returnValue(of(activeResponse));
    unitOfMeasureServiceMock.getAllNotDeletedUnitOfMeasures.and.returnValue(of(activeResponse));
  });

  it('returns the active units of the requested company', () => {
    let names: string[] = [];

    service.getActiveUnits('company-1').subscribe((units) => (names = units.map((unit) => unit.name)));

    expect(unitOfMeasureServiceMock.getUnitOfMeasures).toHaveBeenCalledWith('company-1');
    expect(names).toEqual(['Litro', 'Kilogramo']);
  });

  it('returns the non-deleted units for historical display', () => {
    service.getHistoricalUnits('company-1').subscribe();

    expect(unitOfMeasureServiceMock.getAllNotDeletedUnitOfMeasures).toHaveBeenCalledWith('company-1');
  });

  it('resolves names with an inner-join semantics', () => {
    let resolved = new Map<string, string>();

    service
      .resolveNames(['uom-1', 'uom-1', 'missing', ''], 'company-1')
      .subscribe((names) => (resolved = new Map(names)));

    expect(unitOfMeasureServiceMock.getUnitOfMeasures).toHaveBeenCalledWith('company-1');
    expect(resolved.size).toBe(1);
    expect(resolved.get('uom-1')).toBe('Litro');
    expect(resolved.has('missing')).toBeFalse();
  });

  it('resolves against historical units when requested', () => {
    service.resolveNames(['uom-1'], 'company-1', true).subscribe();

    expect(unitOfMeasureServiceMock.getAllNotDeletedUnitOfMeasures).toHaveBeenCalledWith('company-1');
    expect(unitOfMeasureServiceMock.getUnitOfMeasures).not.toHaveBeenCalled();
  });

  it('does not read the catalog when there is nothing to resolve', () => {
    let size = -1;

    service.resolveNames([], 'company-1').subscribe((names) => (size = names.size));

    expect(size).toBe(0);
    expect(unitOfMeasureServiceMock.getUnitOfMeasures).not.toHaveBeenCalled();
    expect(unitOfMeasureServiceMock.getAllNotDeletedUnitOfMeasures).not.toHaveBeenCalled();
  });

  it('delegates cache invalidation', () => {
    service.invalidateCache('company-1');

    expect(unitOfMeasureServiceMock.invalidateCache).toHaveBeenCalledWith('company-1');
  });
});
