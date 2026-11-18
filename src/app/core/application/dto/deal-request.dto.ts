/**
 * Payload used to create a deal.
 */
export interface CreateDealRequest {
  companyOid: string;
  productOid: string;
  unitOfMeasureOid: string;
  price: number;
  quantity: number;
}

/**
 * Payload used to update a deal.
 *
 * <p>Only quantity, price and status flags are editable; identifiers and dates
 * are preserved by the backend.</p>
 */
export interface UpdateDealRequest {
  quantity?: number;
  price?: number;
  isActive?: boolean;
  isDelete?: boolean;
}
