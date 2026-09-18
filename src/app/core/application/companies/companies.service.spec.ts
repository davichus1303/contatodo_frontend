import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CompaniesService } from './companies.service';
import { HTTP_PORT } from '../ports/http.port';
import { Company } from '../../domain/models/company.model';
import { CreateCompaniesRequest, UpdateCompanyRequest } from '../dto/company-request.dto';
import { COMPANIES_URL } from '../../config/api-routes.constants';

describe('CompaniesService', () => {
  let service: CompaniesService;
  const httpMock = {
    get: jasmine.createSpy('get'),
    post: jasmine.createSpy('post'),
    put: jasmine.createSpy('put'),
    delete: jasmine.createSpy('delete')
  };

  const rawCompany = { id: '  c1  ', name: '  Acme  ', isActive: true, isDeleted: false };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: HTTP_PORT, useValue: httpMock }]
    });
    service = TestBed.inject(CompaniesService);

    httpMock.get.calls.reset();
    httpMock.post.calls.reset();
    httpMock.put.calls.reset();
    httpMock.delete.calls.reset();
  });

  it('should fetch companies and deliver mapped domain models', () => {
    httpMock.get.and.returnValue(of({ status: 200, message: 'OK', data: [rawCompany] }));

    let companies: Company[] = [];
    service.getCompanies().subscribe((response) => {
      companies = response.data;
    });

    expect(httpMock.get).toHaveBeenCalledWith(COMPANIES_URL);
    expect(companies[0].id).toBe('c1');
    expect(companies[0].name).toBe('Acme');
  });

  it('should emit through the error channel when a company violates the contract', () => {
    httpMock.get.and.returnValue(of({ status: 200, message: 'OK', data: [{ id: '', name: 'Acme' }] }));

    let errored = false;
    service.getCompanies().subscribe({ error: () => (errored = true) });

    expect(errored).toBeTrue();
  });

  it('should emit through the error channel when the payload is not a collection', () => {
    httpMock.get.and.returnValue(of({ status: 200, message: 'OK', data: { id: 'c1' } }));

    let errored = false;
    service.getCompanies().subscribe({ error: () => (errored = true) });

    expect(errored).toBeTrue();
  });

  it('should create companies through a POST and map the created collection', () => {
    const request: CreateCompaniesRequest = { companies: [{ name: 'Acme' }] };
    httpMock.post.and.returnValue(of({ status: 200, message: 'OK', data: [rawCompany] }));

    let companies: Company[] = [];
    service.createCompanies(request).subscribe((response) => {
      companies = response.data;
    });

    expect(httpMock.post).toHaveBeenCalledWith(COMPANIES_URL, request);
    expect(companies[0].name).toBe('Acme');
  });

  it('should update a company through a PUT and map the updated company', () => {
    const request: UpdateCompanyRequest = { name: 'Acme' };
    httpMock.put.and.returnValue(of({ status: 200, message: 'OK', data: rawCompany }));

    let company: Company | undefined;
    service.updateCompany('c1', request).subscribe((response) => {
      company = response.data;
    });

    expect(httpMock.put).toHaveBeenCalledWith(`${COMPANIES_URL}/c1`, request);
    expect(company?.name).toBe('Acme');
  });

  it('should delete a company through DELETE without mapping the payload', () => {
    httpMock.delete.and.returnValue(of({ status: 200, message: 'OK', data: null }));

    service.deleteCompany('c1').subscribe();

    expect(httpMock.delete).toHaveBeenCalledWith(`${COMPANIES_URL}/c1`);
  });
});
