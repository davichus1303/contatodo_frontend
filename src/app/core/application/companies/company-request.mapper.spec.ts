import { resolveContactPhoneUpdate, toCreateCompanyRequest, toUpdateCompanyRequest } from './company-request.mapper';
import { CompanyFormModel } from '../../../features/company-catalog/company-dialog/company-form.model';
import { User } from '../../domain/models/user.model';

describe('company-request.mapper', () => {
  const baseModel: CompanyFormModel = {
    name: '  Acme  ',
    webSite: '  https://acme.example.com  ',
    ubication: '  Lima  ',
    contactUserOId: 'u1',
    phoneNumber: '999'
  };

  describe('toCreateCompanyRequest', () => {
    it('should trim the name and include the provided optional fields', () => {
      const request = toCreateCompanyRequest(baseModel);

      expect(request).toEqual({
        name: 'Acme',
        webSite: 'https://acme.example.com',
        ubication: 'Lima',
        contactUserOId: 'u1'
      });
    });

    it('should omit blank optional fields', () => {
      const request = toCreateCompanyRequest({
        ...baseModel,
        webSite: '   ',
        ubication: '',
        contactUserOId: '  '
      });

      expect(request).toEqual({ name: 'Acme' });
      expect(request.webSite).toBeUndefined();
      expect(request.ubication).toBeUndefined();
      expect(request.contactUserOId).toBeUndefined();
    });

    it('should not include the phone number in the company payload', () => {
      const request = toCreateCompanyRequest(baseModel);

      expect('phoneNumber' in request).toBeFalse();
    });
  });

  describe('toUpdateCompanyRequest', () => {
    it('should shape the same editable fields as the create request', () => {
      expect(toUpdateCompanyRequest(baseModel)).toEqual(toCreateCompanyRequest(baseModel));
    });
  });

  describe('resolveContactPhoneUpdate', () => {
    const users: User[] = [
      {
        id: 'u1', userName: 'ana', email: 'ana@example.com', name: 'Ana',
        phoneNumber: '111', createdDate: '', updatedDate: '', active: true
      },
      {
        id: 'u2', userName: 'bob', email: 'bob@example.com', name: 'Bob',
        phoneNumber: null, createdDate: '', updatedDate: '', active: true
      }
    ];

    it('should return the new phone when it differs from the stored one', () => {
      const update = resolveContactPhoneUpdate({ ...baseModel, contactUserOId: 'u1' }, users);

      expect(update).toEqual({ id: 'u1', phoneNumber: '999' });
    });

    it('should return the new phone for a contact without a stored phone', () => {
      const update = resolveContactPhoneUpdate({ ...baseModel, contactUserOId: 'u2' }, users);

      expect(update).toEqual({ id: 'u2', phoneNumber: '999' });
    });

    it('should return null when the phone matches the stored one', () => {
      const model: CompanyFormModel = { ...baseModel, contactUserOId: 'u1', phoneNumber: '111' };

      expect(resolveContactPhoneUpdate(model, users)).toBeNull();
    });

    it('should return null when no phone was written or no contact was selected', () => {
      expect(resolveContactPhoneUpdate({ ...baseModel, phoneNumber: '   ' }, users)).toBeNull();
      expect(resolveContactPhoneUpdate({ ...baseModel, contactUserOId: '   ' }, users)).toBeNull();
    });
  });
});
