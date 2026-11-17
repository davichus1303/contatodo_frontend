/**
 * DTO for creating a sale.
 */
export interface CreateSaleRequest {
  productOid: string;
  quantity: number;
  /** Unit of measure in which the quantity is registered. */
  unitOfMeasureOid: string;
  /** Whether the selected unit represents a pack. */
  isPack: boolean;
  /**
   * Base units contained in one pack.
   *
   * Omitted so the backend uses the pack size stored in the product.
   */
  packSize?: number;
  totalSalePrice: number;
  notes?: string;
  companyOid?: string;
}
