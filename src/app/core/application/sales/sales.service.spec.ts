import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SalesService } from './sales.service';
import { HTTP_PORT } from '../ports/http.port';
import { Sale } from '../../domain/models/sale.model';
import { CreateSaleRequest } from '../dto/create-sale-request.dto';
import { SALES_URL } from '../../config/api-routes.constants';

describe('SalesService', () => {
  let service: SalesService;
  const httpMock = {
    get: jasmine.createSpy('get'),
    post: jasmine.createSpy('post')
  };

  const rawSale = {
    id: ' s1 ',
    saleNumber: 1,
    productOid: 'p1',
    productName: 'Arroz',
    userOid: 'u1',
    quantity: 2,
    totalCost: 16,
    originalTotalPrice: 30,
    totalSalePrice: 30,
    saleDate: '2026-08-21T12:00:00',
    notes: '',
    createdDate: '2026-08-21T12:00:00',
    updatedDate: '2026-08-21T12:00:00'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: HTTP_PORT, useValue: httpMock }]
    });
    service = TestBed.inject(SalesService);

    httpMock.get.calls.reset();
    httpMock.post.calls.reset();
  });

  it('should create a sale through a POST and map the response', () => {
    const request: CreateSaleRequest = { productOid: 'p1', quantity: 2, totalSalePrice: 30 };
    httpMock.post.and.returnValue(of({ status: 200, message: 'OK', data: rawSale }));

    let sale: Sale | undefined;
    service.createSale(request).subscribe((response) => (sale = response.data));

    expect(httpMock.post).toHaveBeenCalledWith(SALES_URL, request);
    expect(sale?.id).toBe('s1');
  });

  it('should fetch today sales and deliver mapped domain sales', () => {
    httpMock.get.and.returnValue(of({ status: 200, message: 'OK', data: [rawSale] }));

    let sales: Sale[] = [];
    service.getTodaySales().subscribe((response) => (sales = response.data));

    expect(httpMock.get).toHaveBeenCalledWith(SALES_URL);
    expect(sales[0].productName).toBe('Arroz');
  });

  it('should fetch sales by date from the date endpoint', () => {
    httpMock.get.and.returnValue(of({ status: 200, message: 'OK', data: [rawSale] }));

    service.getSalesByDate('2026-08-21').subscribe();

    expect(httpMock.get).toHaveBeenCalledWith(`${SALES_URL}/date?date=2026-08-21`);
  });

  it('should fetch sales by date range from the date-range endpoint', () => {
    httpMock.get.and.returnValue(of({ status: 200, message: 'OK', data: [rawSale] }));

    service.getSalesByDateRange(new Date('2026-08-21T00:00:00'), new Date('2026-08-21T23:59:59')).subscribe();

    expect(httpMock.get).toHaveBeenCalledWith(`${SALES_URL}/date-range?startDate=2026-08-21&endDate=2026-08-21`);
  });

  it('should emit through the error channel when a sale violates the contract', () => {
    httpMock.get.and.returnValue(of({ status: 200, message: 'OK', data: [{ id: '' }] }));

    let errored = false;
    service.getTodaySales().subscribe({ error: () => (errored = true) });

    expect(errored).toBeTrue();
  });
});