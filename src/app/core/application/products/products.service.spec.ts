import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ProductsService } from './products.service';
import { HTTP_PORT } from '../ports/http.port';
import { AuthService } from '../../auth/auth.service';
import { Product } from '../../domain/models/product.model';
import { ProductCreatePayload, ProductUpdatePayload } from '../dto/product-request.dto';
import { PRODUCTS_URL } from '../../config/api-routes.constants';

describe('ProductsService', () => {
  let service: ProductsService;
  const httpMock = {
    get: jasmine.createSpy('get'),
    post: jasmine.createSpy('post'),
    put: jasmine.createSpy('put'),
    delete: jasmine.createSpy('delete')
  };
  const authMock = {
    getUserInfo: jasmine.createSpy('getUserInfo').and.returnValue({ id: 'user-1' })
  };

  const rawProduct = {
    id: ' p1 ',
    name: ' Ceviche ',
    description: 'Fish dish',
    stock: 10,
    code: 'P001',
    realCost: 8,
    unitRealCost: 8,
    unitPublicCost: 15,
    isActive: true,
    createdDate: '2026-01-01',
    updatedDate: '2026-01-01'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: HTTP_PORT, useValue: httpMock },
        { provide: AuthService, useValue: authMock }
      ]
    });
    service = TestBed.inject(ProductsService);

    httpMock.get.calls.reset();
    httpMock.post.calls.reset();
    httpMock.put.calls.reset();
    httpMock.delete.calls.reset();
  });

  it('should fetch all products and deliver mapped domain models', () => {
    httpMock.get.and.returnValue(of({ status: 200, message: 'OK', data: [rawProduct] }));

    let products: Product[] = [];
    service.getAllProducts().subscribe((response) => (products = response.data));

    expect(httpMock.get).toHaveBeenCalledWith(PRODUCTS_URL);
    expect(products[0].id).toBe('p1');
    expect(products[0].name).toBe('Ceviche');
  });

  it('should fetch available products with the userOid header', () => {
    httpMock.get.and.returnValue(of({ status: 200, message: 'OK', data: [rawProduct] }));

    service.getAvailableProducts().subscribe();

    expect(httpMock.get).toHaveBeenCalledWith(`${PRODUCTS_URL}/available`, {
      headers: { userOid: 'user-1' }
    });
  });

  it('should fetch a product by id and map the single response', () => {
    httpMock.get.and.returnValue(of({ status: 200, message: 'OK', data: rawProduct }));

    let product: Product | undefined;
    service.getProductById('p1').subscribe((response) => (product = response.data));

    expect(product?.name).toBe('Ceviche');
  });

  it('should create a product and map the response', () => {
    const payload: ProductCreatePayload = {
      name: 'Ceviche',
      description: 'Fish dish',
      stock: 10,
      realCost: 8,
      unitRealCost: 8,
      unitPublicCost: 15
    };
    httpMock.post.and.returnValue(of({ status: 200, message: 'OK', data: rawProduct }));

    service.createProduct(payload).subscribe();

    expect(httpMock.post).toHaveBeenCalledWith(PRODUCTS_URL, payload);
  });

  it('should update a product and map the response', () => {
    const payload: ProductUpdatePayload = {
      name: 'Ceviche v2',
      description: 'Fish dish',
      stock: 5,
      realCost: 8,
      unitRealCost: 8,
      unitPublicCost: 15
    };
    httpMock.put.and.returnValue(of({ status: 200, message: 'OK', data: rawProduct }));

    service.updateProduct('p1', payload).subscribe();

    expect(httpMock.put).toHaveBeenCalledWith(`${PRODUCTS_URL}/p1`, payload);
  });

  it('should emit through the error channel when a product violates the contract', () => {
    httpMock.get.and.returnValue(of({ status: 200, message: 'OK', data: [{ id: '', name: 'Ceviche' }] }));

    let errored = false;
    service.getAllProducts().subscribe({ error: () => (errored = true) });

    expect(errored).toBeTrue();
  });
});
