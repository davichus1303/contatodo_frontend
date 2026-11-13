import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { UnitOfMeasureService } from './unit-of-measure.service';
import { HTTP_PORT } from '../ports/http.port';
import { UNIT_OF_MEASURES_URL } from '../../config/api-routes.constants';

describe('UnitOfMeasureService', () => {
  let service: UnitOfMeasureService;

  const httpMock = {
    get: jasmine.createSpy('get'),
    post: jasmine.createSpy('post'),
    put: jasmine.createSpy('put'),
    delete: jasmine.createSpy('delete')
  };

  const rawUnit = {
    id: 'uom-1',
    name: ' Litro ',
    abrev: 'lt',
    companyOid: 'company-1',
    isActive: true,
    isDeleted: false,
    isDivisible: true,
    isPack: true
  };

  const catalogResponse = {
    status: 200,
    message: 'OK',
    data: [rawUnit]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: HTTP_PORT, useValue: httpMock }]
    });
    service = TestBed.inject(UnitOfMeasureService);

    httpMock.get.calls.reset();
    httpMock.post.calls.reset();
    httpMock.put.calls.reset();
    httpMock.delete.calls.reset();
  });

  it('maps and caches the active catalog per company', () => {
    httpMock.get.and.returnValue(of(catalogResponse));

    let firstName = '';
    let secondName = '';
    let mappedAsPack = false;

    service.getUnitOfMeasures('company-1').subscribe((response) => {
      firstName = response.data[0].name;
      mappedAsPack = response.data[0].isPack;
    });
    service.getUnitOfMeasures('company-1').subscribe((response) => (secondName = response.data[0].name));

    expect(httpMock.get).toHaveBeenCalledTimes(1);
    expect(httpMock.get).toHaveBeenCalledWith(UNIT_OF_MEASURES_URL, {
      params: { companyOid: 'company-1' }
    });
    expect(firstName).toBe('Litro');
    expect(secondName).toBe('Litro');
    expect(mappedAsPack).toBeTrue();
  });

  it('caches different companies independently', () => {
    httpMock.get.and.returnValue(of(catalogResponse));

    service.getUnitOfMeasures('company-1').subscribe();
    service.getUnitOfMeasures('company-2').subscribe();

    expect(httpMock.get).toHaveBeenCalledTimes(2);
    expect(httpMock.get).toHaveBeenCalledWith(UNIT_OF_MEASURES_URL, {
      params: { companyOid: 'company-1' }
    });
    expect(httpMock.get).toHaveBeenCalledWith(UNIT_OF_MEASURES_URL, {
      params: { companyOid: 'company-2' }
    });
  });

  it('keeps active and historical reads in separate caches', () => {
    httpMock.get.and.returnValue(of(catalogResponse));

    service.getUnitOfMeasures('company-1').subscribe();
    service.getAllNotDeletedUnitOfMeasures('company-1').subscribe();

    expect(httpMock.get).toHaveBeenCalledTimes(2);
    expect(httpMock.get).toHaveBeenCalledWith(`${UNIT_OF_MEASURES_URL}/admin/all`, {
      params: { companyOid: 'company-1' }
    });
  });

  it('evicts the company cache after an update', () => {
    httpMock.get.and.returnValue(of(catalogResponse));
    httpMock.put.and.returnValue(of({ status: 200, message: 'OK', data: rawUnit }));

    service.getUnitOfMeasures('company-1').subscribe();
    service.updateUnitOfMeasure('uom-1', { name: 'Litro' }, 'company-1').subscribe();
    service.getUnitOfMeasures('company-1').subscribe();

    expect(httpMock.get).toHaveBeenCalledTimes(2);
  });

  it('evicts every cache after a session-scoped mutation', () => {
    httpMock.get.and.returnValue(of(catalogResponse));
    httpMock.delete.and.returnValue(of({ status: 200, message: 'OK', data: null }));

    service.getUnitOfMeasures('company-1').subscribe();
    service.getUnitOfMeasures('company-2').subscribe();
    service.deleteUnitOfMeasure('uom-1').subscribe();

    service.getUnitOfMeasures('company-1').subscribe();
    service.getUnitOfMeasures('company-2').subscribe();

    expect(httpMock.get).toHaveBeenCalledTimes(4);
  });

  it('does not cache a failed read', () => {
    httpMock.get.and.returnValue(throwError(() => new Error('network')));

    service.getUnitOfMeasures('company-1').subscribe({
      error: () => undefined
    });

    httpMock.get.and.returnValue(of(catalogResponse));
    service.getUnitOfMeasures('company-1').subscribe();

    expect(httpMock.get).toHaveBeenCalledTimes(2);
  });

  it('shares an in-flight read between concurrent subscribers', () => {
    httpMock.get.and.returnValue(of(catalogResponse));

    service.getUnitOfMeasures('company-1').subscribe();
    service.getUnitOfMeasures('company-1').subscribe();

    expect(httpMock.get).toHaveBeenCalledTimes(1);
  });

  it('clears the cache for a specific company only', () => {
    httpMock.get.and.returnValue(of(catalogResponse));

    service.getUnitOfMeasures('company-1').subscribe();
    service.getUnitOfMeasures('company-2').subscribe();
    service.invalidateCache('company-1');

    service.getUnitOfMeasures('company-1').subscribe();
    service.getUnitOfMeasures('company-2').subscribe();

    expect(httpMock.get).toHaveBeenCalledTimes(3);
  });
});
