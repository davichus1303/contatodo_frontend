import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AcquisitionTypeService } from './acquisition-type.service';
import { HTTP_PORT } from '../ports/http.port';
import { AcquisitionType } from '../../domain/models/acquisition-type.model';
import {
  CreateAcquisitionTypeRequest,
  UpdateAcquisitionTypeRequest
} from '../dto/acquisition-type-request.dto';
import { ACQUISITION_TYPES_URL } from '../../config/api-routes.constants';

describe('AcquisitionTypeService', () => {
  let service: AcquisitionTypeService;
  const httpMock = {
    get: jasmine.createSpy('get'),
    post: jasmine.createSpy('post'),
    put: jasmine.createSpy('put'),
    delete: jasmine.createSpy('delete')
  };

  const rawType = {
    id: ' t1 ',
    name: ' Mercancia ',
    description: 'Producto para vender',
    isActive: true,
    isDeleted: false,
    affectsInventory: true,
    createdDate: '2026-01-01',
    updatedDate: '2026-01-01'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: HTTP_PORT, useValue: httpMock }]
    });
    service = TestBed.inject(AcquisitionTypeService);

    httpMock.get.calls.reset();
    httpMock.post.calls.reset();
    httpMock.put.calls.reset();
    httpMock.delete.calls.reset();
  });

  it('should fetch active types and deliver mapped domain models', () => {
    httpMock.get.and.returnValue(of({ status: 200, message: 'OK', data: [rawType] }));

    let types: AcquisitionType[] = [];
    service.getAcquisitionTypes().subscribe((response) => (types = response.data));

    expect(httpMock.get).toHaveBeenCalledWith(ACQUISITION_TYPES_URL);
    expect(types[0].id).toBe('t1');
    expect(types[0].name).toBe('Mercancia');
  });

  it('should fetch all non-deleted types from the admin endpoint', () => {
    httpMock.get.and.returnValue(of({ status: 200, message: 'OK', data: [rawType] }));

    service.getAllNotDeletedAcquisitionTypes().subscribe();

    expect(httpMock.get).toHaveBeenCalledWith(`${ACQUISITION_TYPES_URL}/admin/all`);
  });

  it('should emit through the error channel when a type violates the contract', () => {
    httpMock.get.and.returnValue(of({ status: 200, message: 'OK', data: [{ id: '', name: 'Mercancia' }] }));

    let errored = false;
    service.getAcquisitionTypes().subscribe({ error: () => (errored = true) });

    expect(errored).toBeTrue();
  });

  it('should create a type through a POST and map the response', () => {
    const payload: CreateAcquisitionTypeRequest = { name: 'Mercancia', affectsInventory: true };
    httpMock.post.and.returnValue(of({ status: 200, message: 'OK', data: rawType }));

    let type: AcquisitionType | undefined;
    service.createAcquisitionType(payload).subscribe((response) => (type = response.data));

    expect(httpMock.post).toHaveBeenCalledWith(ACQUISITION_TYPES_URL, payload);
    expect(type?.name).toBe('Mercancia');
  });

  it('should update a type through a PUT and map the response', () => {
    const payload: UpdateAcquisitionTypeRequest = { isActive: false };
    httpMock.put.and.returnValue(of({ status: 200, message: 'OK', data: rawType }));

    service.updateAcquisitionType('t1', payload).subscribe();

    expect(httpMock.put).toHaveBeenCalledWith(`${ACQUISITION_TYPES_URL}/t1`, payload);
  });

  it('should delete a type through DELETE and map the returned type', () => {
    httpMock.delete.and.returnValue(of({ status: 200, message: 'OK', data: rawType }));

    let type: AcquisitionType | undefined;
    service.deleteAcquisitionType('t1').subscribe((response) => (type = response.data));

    expect(httpMock.delete).toHaveBeenCalledWith(`${ACQUISITION_TYPES_URL}/t1`);
    expect(type?.id).toBe('t1');
  });
});
