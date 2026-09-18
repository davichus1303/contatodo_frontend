import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AcquisitionsService } from './acquisitions.service';
import { HTTP_PORT } from '../ports/http.port';
import { Acquisition } from '../../domain/models/acquisition.model';
import { CreateAcquisitionRequest } from '../dto/acquisition-request.dto';
import { ACQUISITIONS_URL } from '../../config/api-routes.constants';

describe('AcquisitionsService', () => {
  let service: AcquisitionsService;
  const httpMock = {
    get: jasmine.createSpy('get'),
    post: jasmine.createSpy('post')
  };

  const rawAcquisition = {
    id: ' a1 ',
    productName: ' Arroz ',
    acquisitionType: 'Mercancia',
    quantity: 5,
    realCost: 50,
    unitRealCost: 10,
    unitPublicCost: 15,
    supplierName: 'ACME',
    invoiceNumber: 'F001',
    acquisitionDate: '2026-08-21T10:00:00',
    observations: 'ok'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: HTTP_PORT, useValue: httpMock }]
    });
    service = TestBed.inject(AcquisitionsService);

    httpMock.get.calls.reset();
    httpMock.post.calls.reset();
  });

  it('should fetch acquisitions and deliver mapped domain models', () => {
    httpMock.get.and.returnValue(of({ status: 200, message: 'OK', data: [rawAcquisition] }));

    let acquisitions: Acquisition[] = [];
    service.getAcquisitions().subscribe((response) => (acquisitions = response.data));

    expect(httpMock.get).toHaveBeenCalledWith(ACQUISITIONS_URL);
    expect(acquisitions[0].id).toBe('a1');
    expect(acquisitions[0].productName).toBe('Arroz');
  });

  it('should append the ISO date range to the URL when both bounds are given', () => {
    httpMock.get.and.returnValue(of({ status: 200, message: 'OK', data: [] }));
    const startDate = new Date('2026-08-01T00:00:00.000Z');
    const endDate = new Date('2026-08-31T23:59:59.000Z');

    service.getAcquisitions(startDate, endDate).subscribe();

    expect(httpMock.get).toHaveBeenCalledWith(
      `${ACQUISITIONS_URL}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
    );
  });

  it('should emit through the error channel when an acquisition violates the contract', () => {
    httpMock.get.and.returnValue(of({ status: 200, message: 'OK', data: [{ id: '', productName: 'Arroz' }] }));

    let errored = false;
    service.getAcquisitions().subscribe({ error: () => (errored = true) });

    expect(errored).toBeTrue();
  });

  it('should create an acquisition through a POST and map the response', () => {
    const request: CreateAcquisitionRequest = { acquisitionTypeOid: 't1', realCost: 50 };
    httpMock.post.and.returnValue(of({ status: 200, message: 'OK', data: rawAcquisition }));

    let acquisition: Acquisition | undefined;
    service.createAcquisition(request).subscribe((response) => (acquisition = response.data));

    expect(httpMock.post).toHaveBeenCalledWith(ACQUISITIONS_URL, request);
    expect(acquisition?.productName).toBe('Arroz');
  });
});
