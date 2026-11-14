/**
 * Request DTO for creating an acquisition.
 */
export interface CreateAcquisitionRequest {
  acquisitionTypeOid: string;
  productName?: string;
  description?: string;
  /** Units declared by a brand-new product. Omitted for existing products. */
  unitOfMeasures?: string[];
  /** Unit used to register the acquisition. Required by the backend. */
  unitOfMeasure?: string;
  /** Explicit acquisition unit identifier; mirrors {@link unitOfMeasure}. */
  unitOfMeasureOid?: string;
  /** Base units contained in one pack, only for brand-new products acquired by pack. */
  packSize?: number;
  quantity?: number;
  realCost: number;
  unitPublicCost?: number;
  supplierOid?: string;
  supplierName?: string;
  invoiceNumber?: string;
  observations?: string;
  companyOid?: string;
}
