import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DealsService } from './deals.service';
import { HTTP_PORT } from '../ports/http.port';
import { DEALS_URL } from '../../config/api-routes.constants';
import { Deal } from '../../domain/models/deal.model';
import { CreateDealRequest, UpdateDealRequest } from '../dto/deal-request.dto';

describe('DealsService', () => {
  let service: DealsService;
  const httpMock = {
    get: jasmine.createSpy('get'),
    post: jasmine.createSpy('post'),
    put: jasmine.createSpy('put'),
    delete: jasmine.createSpy('delete')
  };

  const rawDeal = {
    id: ' deal-1 ',
    productOid: ' product-1 ',
    unitOfMeasureOid: ' uom-1 ',
    quantity: 2.5,
    price: 120,
    companyOid: ' company-1 ',
    createdDate: '2026-11-18T11:17:50.656',
    updateDate: '2026-11-18T11:17:50.656',
    isActive: true,
    isDelete: false
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: HTTP_PORT, useValue: httpMock }]
    });
    service = TestBed.inject(DealsService);

    httpMock.get.calls.reset();
    httpMock.post.calls.reset();
    httpMock.put.calls.reset();
    httpMock.delete.calls.reset();
  });

  it('should fetch deals and deliver mapped domain models', () => {
    httpMock.get.and.returnValue(of({ status: 200, message: 'OK', data: [rawDeal] }));

    let deals: Deal[] = [];
    service.getDeals('company-1').subscribe((response) => (deals = response.data));

    expect(httpMock.get).toHaveBeenCalledWith(DEALS_URL, { params: { companyOid: 'company-1' } });
    expect(deals[0].id).toBe('deal-1');
    expect(deals[0].productOid).toBe('product-1');
    expect(deals[0].unitOfMeasureOid).toBe('uom-1');
    expect(deals[0].companyOid).toBe('company-1');
  });

  it('should fetch active and non-deleted deals', () => {
    httpMock.get.and.returnValue(of({ status: 200, message: 'OK', data: [rawDeal] }));

    service.getActiveNotDeletedDeals('company-1').subscribe();

    expect(httpMock.get).toHaveBeenCalledWith(`${DEALS_URL}/activeNotDeleted`, { params: { companyOid: 'company-1' } });
  });

  it('should create a deal and map the response', () => {
    const request: CreateDealRequest = {
      companyOid: 'company-1',
      productOid: 'product-1',
      unitOfMeasureOid: 'uom-1',
      quantity: 2.5,
      price: 120
    };
    httpMock.post.and.returnValue(of({ status: 200, message: 'OK', data: rawDeal }));

    let deal: Deal | undefined;
    service.createDeal(request).subscribe((response) => (deal = response.data));

    expect(httpMock.post).toHaveBeenCalledWith(DEALS_URL, request);
    expect(deal?.id).toBe('deal-1');
  });

  it('should update a deal by oid and map the response', () => {
    const request: UpdateDealRequest = { quantity: 5, price: 70, isActive: true };
    httpMock.put.and.returnValue(of({ status: 200, message: 'OK', data: rawDeal }));

    let deal: Deal | undefined;
    service.updateDeal('deal-1', request).subscribe((response) => (deal = response.data));

    expect(httpMock.put).toHaveBeenCalledWith(DEALS_URL, request, { params: { oid: 'deal-1' } });
    expect(deal?.id).toBe('deal-1');
  });

  it('should delete a deal by oid', () => {
    httpMock.delete.and.returnValue(of({ status: 200, message: 'OK', data: [] }));

    service.deleteDeal('deal-1').subscribe();

    expect(httpMock.delete).toHaveBeenCalledWith(DEALS_URL, { params: { oid: 'deal-1' } });
  });

  it('should emit through the error channel when a deal violates the contract', () => {
    httpMock.get.and.returnValue(of({ status: 200, message: 'OK', data: [{ id: '' }] }));

    let errored = false;
    service.getDeals('company-1').subscribe({ error: () => (errored = true) });

    expect(errored).toBeTrue();
  });
});
