import { CreateAcquisitionRequest } from '../dto/acquisition-request.dto';
import { AcquisitionFormModel } from '../../../features/acquisitions/new-acquisition/acquisition-form.model';

/**
 * Maps the acquisition form view model to the transport request.
 *
 * The acquisition unit is always sent because the backend requires it for
 * inventory and expense flows. Conditional fields replicate the legacy
 * contract exactly: optional text fields are only included when truthy,
 * quantity falls back to 1 for brand new products, inventory-only fields are
 * omitted when the selected type does not affect inventory, and the product
 * attributes (unit list and pack size) only travel for brand-new products.
 *
 * @param model Form view model emitted by the acquisition form component.
 * @param companyOid Company selected in the list page, inherited by the form.
 * @returns Request payload accepted by `POST /acquisitions`.
 */
export function toCreateAcquisitionRequest(
  model: AcquisitionFormModel,
  companyOid?: string
): CreateAcquisitionRequest {
  const request: CreateAcquisitionRequest = {
    acquisitionTypeOid: model.acquisitionTypeOid ?? '',
    realCost: model.realCost as number
  };

  if (companyOid) {
    request.companyOid = companyOid;
  }

  if (model.unitOfMeasure) {
    request.unitOfMeasure = model.unitOfMeasure;
    request.unitOfMeasureOid = model.unitOfMeasure;
  }

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
    if (model.isNewProduct) {
      if (model.newProductDescription) {
        request.description = model.newProductDescription;
      }
      if (model.unitOfMeasures.length > 0) {
        request.unitOfMeasures = [...model.unitOfMeasures];
      }
      if (model.packSize != null) {
        request.packSize = model.packSize;
      }
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
