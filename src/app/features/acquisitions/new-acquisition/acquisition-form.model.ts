import { Product } from '@core/domain/models/product.model';

/**
 * View model emitted by {@link AcquisitionFormComponent} when the user saves.
 *
 * It carries the raw form state (control values plus derived flags) so the
 * container can delegate transport-shaping to the application mapper
 * (`toCreateAcquisitionRequest`) without owning form logic.
 */
export interface AcquisitionFormModel {
  readonly acquisitionTypeOid: string | null;
  /** Raw `productSearch` control value: typed text or a selected product. */
  readonly productSearchRaw: string | Product | null;
  /** True when the typed product name does not exist in the database. */
  readonly isNewProduct: boolean;
  /** True when the selected acquisition type affects inventory. */
  readonly affectsInventory: boolean;
  readonly quantity: number | null;
  readonly realCost: number | null;
  readonly unitPublicCost: number | null;
  readonly supplierName: string | null;
  readonly invoiceNumber: string | null;
  readonly observations: string | null;
  readonly newProductDescription: string | null;
  readonly newProductStock: number | null;
}
