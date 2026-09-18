import { mapCompanies } from './company.mapper';

describe('mapCompanies', () => {
  const validCompany = {
    id: 'company-1',
    name: 'Acme',
    rfc: 'ACM010101ABC',
    webSite: 'https://acme.example.com',
    ubication: 'Lima',
    contactUserOId: 'user-1',
    contactName: 'Ana',
    contactPhone: '987654321',
    isActive: true,
    isDeleted: false
  };

  it('should map a valid collection to domain companies', () => {
    const result = mapCompanies([validCompany, { id: 'company-2', name: 'Globex' }]);

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.length).toBe(2);
      expect(result.value[0].name).toBe('Acme');
      expect(result.value[1].isActive).toBeFalse();
    }
  });

  it('should fail with the offending index when an element is invalid', () => {
    const result = mapCompanies([validCompany, { id: '', name: 'Globex' }]);

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error.map((error) => error.field)).toContain('companies[1].id');
    }
  });

  it('should accumulate every violation with its index', () => {
    const result = mapCompanies([{ id: '', name: '' }, { id: 'company-2', name: 'Globex' }]);

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      const fields = result.error.map((error) => error.field);
      expect(fields).toContain('companies[0].id');
      expect(fields).toContain('companies[0].name');
    }
  });

  it('should reject a payload that is not an array', () => {
    expect(mapCompanies(null).ok).toBeFalse();
    expect(mapCompanies({ id: 'company-1' }).ok).toBeFalse();
    expect(mapCompanies('company').ok).toBeFalse();
  });
});
