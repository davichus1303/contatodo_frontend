/**
 * Request DTO for creating an acquisition.
 */
export interface CreateAcquisitionRequest {
  acquisitionTypeOid: string;
  productName: string;
  description?: string;
  quantity: number;
  realCost: number;
  unitPublicCost: number;
  supplierOid?: string;
  supplierName?: string;
  invoiceNumber?: string;
  observations?: string;
}
