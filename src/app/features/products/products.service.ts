import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../../shared/interfaces/api-response.interface';
import { Product } from '../../shared/models/product.model';
import { PRODUCTS_URL } from '../../shared/constants/api-routes.constants';
import { AuthService } from '../../core/auth/auth.service';
import { LoginResponse } from '../../shared/dto/login-response.dto';
import { ProductCreatePayload, ProductUpdatePayload } from '../../shared/dto/product-request.dto';

/**
 * Service responsible for products operations.
 */
@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private readonly API_URL = PRODUCTS_URL;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Retrieves all products.
   *
   * @returns Observable with API response containing all products.
   */
  getAllProducts(): Observable<ApiResponse<Product[]>> {
    return this.http.get<ApiResponse<Product[]>>(this.API_URL);
  }

  /**
   * Retrieves available products for the authenticated user (stock > 0).
   *
   * @returns Observable with API response containing available products.
   */
  getAvailableProducts(): Observable<ApiResponse<Product[]>> {
    const userInfo: LoginResponse['user'] | null = this.authService.getUserInfo();
    const userOid: string = userInfo?.id ?? '';

    const headers = new HttpHeaders({
      userOid
    });

    return this.http.get<ApiResponse<Product[]>>(`${this.API_URL}/available`, { headers });
  }

  /**
   * Retrieves a product by ID.
   *
   * @param id Product ID.
   * @returns Observable with API response containing the product.
   */
  getProductById(id: string): Observable<ApiResponse<Product>> {
    return this.http.get<ApiResponse<Product>>(`${this.API_URL}/${id}`);
  }

  /**
   * Creates a new product.
   *
   * @param product Product to create.
   * @returns Observable with API response containing the created product.
   */
  createProduct(product: ProductCreatePayload): Observable<ApiResponse<Product>> {
    return this.http.post<ApiResponse<Product>>(this.API_URL, product);
  }

  /**
   * Updates an existing product.
   *
   * @param id Product ID.
   * @param product Product data to update.
   * @returns Observable with API response containing the updated product.
   */
  updateProduct(id: string, product: ProductUpdatePayload): Observable<ApiResponse<Product>> {
    return this.http.put<ApiResponse<Product>>(`${this.API_URL}/${id}`, product);
  }
}
