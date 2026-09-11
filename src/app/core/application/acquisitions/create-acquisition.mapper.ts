import { CreateAcquisitionRequest } from '../dto/acquisition-request.dto';
import { AcquisitionFormModel } from '../../../features/acquisitions/new-acquisition/acquisition-form.model';

/**
 * Maps the acquisition form view model to the transport request.
 *
 * Conditional fields replicate the legacy contract exactly: optional text
 * fields are only included when truthy, quantity falls back to 1 for brand
 * new products, and inventory-only fields are omitted when the selected type
 * does not affect inventory.
 *
 * @param model Form view model emitted by the acquisition form component.
 * @returns Request payload accepted by `POST /acquisitions`.
 */
export function toCreateAcquisitionRequest(model: AcquisitionFormModel): CreateAcquisitionRequest {
  const request: CreateAcquisitionRequest = {
    acquisitionTypeOid: model.acquisitionTypeOid ?? '',
    realCost: model.realCost as number
  };

  if (model.affectsInventory) {
    const raw = model.productSearchRaw;
    // Legacy branches were identical; kept as a single assignment.
    const productName = typeof raw === 'string' ? raw : raw?.name || '';
    request.productName = productName;

    request.quantity = model.isNewProduct
      ? (model.newProductStock || 1)
      : (model.quantity as number);

    if (model.unitPublicCost) {
      request.unitPublicCost = model.unitPublicCost;
    }
    if (model.isNewProduct && model.newProductDescription) {
      request.description = model.newProductDescription;
    }
  } else {
    if (model.productSearchRaw && typeof model.productSearchRaw === 'string') {
      request.productName = model.productSearchRaw.trim();
    }
    // Legacy forwarded the raw control value (possibly null).
    request.quantity = model.quantity as number;
  }

  if (model.supplierName) {
    request.supplierName = model.supplierName;
  }
  if (model.invoiceNumber) {
    request.invoiceNumber = model.invoiceNumber;
  }
  if (model.observations) {
    request.observations = model.observations;
  }

  return request;
}
