import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { HTTP_PORT } from '../ports/http.port';
import { ApiResponse } from '../ports/api-response.interface';
import { Product } from '../../domain/models/product.model';
import { PRODUCTS_URL } from '../../config/api-routes.constants';
import { AuthService } from '../../auth/auth.service';
import { ProductCreatePayload, ProductUpdatePayload } from '../dto/product-request.dto';

const USER_OID_HEADER = 'userOid';

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
    return this.http.get<ApiResponse<Product[]>>(this.apiUrl);
  }

  /**
   * Retrieves available products for the authenticated user (stock > 0).
   *
   * The user id is resolved from the current session and sent in the
   * `userOid` header expected by the backend.
   *
   * @returns Observable with API response containing available products.
   */
  getAvailableProducts(): Observable<ApiResponse<Product[]>> {
    const userOid: string = this.authService.getUserInfo()?.id ?? '';

    return this.http.get<ApiResponse<Product[]>>(`${this.apiUrl}/available`, {
      headers: { [USER_OID_HEADER]: userOid }
    });
  }

  /**
   * Retrieves a product by ID.
   *
   * @param id Product ID.
   * @returns Observable with API response containing the product.
   */
  getProductById(id: string): Observable<ApiResponse<Product>> {
    return this.http.get<ApiResponse<Product>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Creates a new product.
   *
   * @param product Product to create.
   * @returns Observable with API response containing the created product.
   */
  createProduct(product: ProductCreatePayload): Observable<ApiResponse<Product>> {
    return this.http.post<ApiResponse<Product>>(this.apiUrl, product);
  }

  /**
   * Updates an existing product.
   *
   * @param id Product ID.
   * @param product Product data to update.
   * @returns Observable with API response containing the updated product.
   */
  updateProduct(id: string, product: ProductUpdatePayload): Observable<ApiResponse<Product>> {
    return this.http.put<ApiResponse<Product>>(`${this.apiUrl}/${id}`, product);
  }
}
