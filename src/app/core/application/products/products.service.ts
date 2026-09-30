import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { HTTP_PORT } from '../ports/http.port';
import { ApiResponse } from '../ports/api-response.interface';
import { createProduct, Product } from '../../domain/models/product.model';
import { DomainError } from '../../domain/errors/domain-error';
import { Result } from '../../domain/result';
import { mapProducts } from './product.mapper';
import { PRODUCTS_URL } from '../../config/api-routes.constants';
import { GENERAL_CONSTANTS } from '@shared/constants/general.constants';
import { AuthService } from '../../auth/auth.service';
import { ProductCreatePayload, ProductUpdatePayload } from '../dto/product-request.dto';

/**
 * Use cases for the product catalog (list, detail, create, update).
 */
@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private readonly http = inject(HTTP_PORT);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = PRODUCTS_URL;

  /**
   * Retrieves all products.
   *
   * @returns Observable with API response containing all products.
   */
  getAllProducts(): Observable<ApiResponse<Product[]>> {
    return this.http.get<ApiResponse<unknown>>(this.apiUrl).pipe(
      map((response) => this.withMappedData(response, mapProducts(response.data)))
    );
  }

  /**
   * Retrieves available products for the authenticated user (stock > 0).
   *
   * The user id is resolved from the current session and sent in the
   * `userOid` header expected by the backend.
   *
   * <p>The company scope is optional and only takes effect for sessions that
   * carry no company claim (a root user). For every other session the backend
   * ignores the parameter and scopes the query to the session company, so the
   * value is omitted rather than sent empty.</p>
   *
   * @param companyOid Owning company identifier, or undefined to use the session company.
   * @returns Observable with API response containing available products.
   */
  getAvailableProducts(companyOid?: string): Observable<ApiResponse<Product[]>> {
    const userOid: string = this.authService.getUserInfo()?.id ?? '';

    return this.http
      .get<ApiResponse<unknown>>(`${this.apiUrl}/available`, {
        headers: { [GENERAL_CONSTANTS.HTTP.HEADERS.USER_OID]: userOid },
        params: { [GENERAL_CONSTANTS.HTTP.PARAMS.COMPANY_OID]: companyOid }
      })
      .pipe(map((response) => this.withMappedData(response, mapProducts(response.data))));
  }

  /**
   * Retrieves a product by ID.
   *
   * @param id Product ID.
   * @returns Observable with API response containing the product.
   */
  getProductById(id: string): Observable<ApiResponse<Product>> {
    return this.http.get<ApiResponse<unknown>>(`${this.apiUrl}/${id}`).pipe(
      map((response) => this.withMappedData(response, createProduct(response.data)))
    );
  }

  /**
   * Creates a new product.
   *
   * @param product Product to create.
   * @returns Observable with API response containing the created product.
   */
  createProduct(product: ProductCreatePayload): Observable<ApiResponse<Product>> {
    return this.http.post<ApiResponse<unknown>>(this.apiUrl, product).pipe(
      map((response) => this.withMappedData(response, createProduct(response.data)))
    );
  }

  /**
   * Updates an existing product.
   *
   * @param id Product ID.
   * @param product Product data to update.
   * @returns Observable with API response containing the updated product.
   */
  updateProduct(id: string, product: ProductUpdatePayload): Observable<ApiResponse<Product>> {
    return this.http.put<ApiResponse<unknown>>(`${this.apiUrl}/${id}`, product).pipe(
      map((response) => this.withMappedData(response, createProduct(response.data)))
    );
  }

  /**
   * Replaces the raw transport `data` with its validated domain value.
   *
   * Fail-fast: a contract violation is rethrown through the observable error
   * channel, so callers never receive unvalidated transport data.
   *
   * @param response Raw API response.
   * @param mapped Result of mapping {@link ApiResponse.data}.
   * @returns API response whose `data` is the domain value.
   */
  private withMappedData<T>(
    response: ApiResponse<unknown>,
    mapped: Result<T, readonly DomainError[]>
  ): ApiResponse<T> {
    if (!mapped.ok) {
      throw mapped.error;
    }

    return { ...response, data: mapped.value };
  }
}
