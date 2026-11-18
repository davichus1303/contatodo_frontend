/**
 * DTO for creating a sale.
 */
export interface CreateSaleRequest {
  productOid: string;
  quantity: number;
  unitOfMeasureOid: string;
  isPack: boolean;
  packSize?: number;
  totalSalePrice: number;
  notes?: string;
  companyOid?: string;
}
