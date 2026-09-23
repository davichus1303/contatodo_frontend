import { CreateCompanyRequest, UpdateCompanyRequest } from '../dto/company-request.dto';
import { User } from '../../domain/models/user.model';
import { CompanyFormModel } from '../../../features/company-catalog/company-dialog/company-form.model';

/**
 * Maps the company form view model to the bulk create transport request.
 *
 * The name is trimmed; optional text fields are only included when they have
 * content and an empty contact is omitted so the backend keeps it unset.
 *
 * @param model Raw form state emitted by the company dialog.
 * @returns Request payload accepted by `POST /companies`.
 */
export function toCreateCompanyRequest(model: CompanyFormModel): CreateCompanyRequest {
  const request: CreateCompanyRequest = { name: model.name.trim() };

  const webSite = model.webSite.trim();
  if (webSite.length > 0) {
    request.webSite = webSite;
  }

  const ubication = model.ubication.trim();
  if (ubication.length > 0) {
    request.ubication = ubication;
  }

  const contactUserOId = model.contactUserOId.trim();
  if (contactUserOId.length > 0) {
    request.contactUserOId = contactUserOId;
  }

  return request;
}

/**
 * Maps the company form view model to the update transport request.
 *
 * The editable fields are the same as in the create payload, so the request is
 * built from {@link toCreateCompanyRequest} and typed as an update request.
 *
 * @param model Raw form state emitted by the company dialog.
 * @returns Request payload accepted by `PUT /companies/{id}`.
 */
export function toUpdateCompanyRequest(model: CompanyFormModel): UpdateCompanyRequest {
  return toCreateCompanyRequest(model);
}

/**
 * Update to apply on a contact user phone number.
 */
export interface ContactPhoneUpdate {
  readonly id: string;
  readonly phoneNumber: string;
}

/**
 * Resolves the user phone update that must follow the company save.
 *
 * A phone is only persisted on the contact when a number was written and it
 * differs from the contact current phone; otherwise there is nothing to
 * update. The company payload never carries the phone.
 *
 * @param model Raw form state emitted by the company dialog.
 * @param users Contacts available to resolve the current phone.
 * @returns The contact identifier and new phone, or null when nothing must change.
 */
export function resolveContactPhoneUpdate(
  model: CompanyFormModel,
  users: readonly User[]
): ContactPhoneUpdate | null {
  const contactUserOId = model.contactUserOId.trim();
  const phoneNumber = model.phoneNumber.trim();

  if (contactUserOId.length === 0 || phoneNumber.length === 0) {
    return null;
  }

  const contact = users.find((user) => user.id === contactUserOId);
  if (contact && (contact.phoneNumber ?? '') === phoneNumber) {
    return null;
  }

  return { id: contactUserOId, phoneNumber };
}
