/**
 * Sale model.
 */
export interface Sale {
  id: string;
  saleNumber: number;
  productOid: string;
  productName?: string;
  userOid: string;
  quantity: number;
  totalCost: number;
  originalTotalPrice: number;
  totalSalePrice: number;
  saleDate: string;
  notes: string;
  createdDate: string;
  updatedDate: string;
}
