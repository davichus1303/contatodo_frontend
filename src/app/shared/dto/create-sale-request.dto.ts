/**
 * DTO for creating a sale.
 */
export interface CreateSaleRequest {
  productOid: string;
  quantity: number;
  totalSalePrice: number;
  notes?: string;
}
