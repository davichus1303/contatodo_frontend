/**
 * Acquisition model.
 */
export interface Acquisition {
  id: string;
  productName: string;
  acquisitionType: string;
  quantity: number;
  realCost: number;
  unitRealCost: number;
  unitPublicCost: number;
  supplierName: string;
  invoiceNumber: string;
  acquisitionDate: string;
  observations: string;
}
