import { createCompany } from './company.model';

describe('createCompany', () => {
  function validCompany(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: 'company-1',
      name: 'Acme',
      rfc: 'ACM010101ABC',
      webSite: 'https://acme.example.com',
      ubication: 'Lima',
      contactUserOId: 'user-1',
      contactName: 'Ana',
      contactPhone: '987654321',
      isActive: true,
      isDeleted: false,
      ...overrides
    };
  }

  it('should accept a fully populated payload and preserve every field', () => {
    const result = createCompany(validCompany());

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.id).toBe('company-1');
      expect(result.value.name).toBe('Acme');
      expect(result.value.rfc).toBe('ACM010101ABC');
      expect(result.value.contactName).toBe('Ana');
      expect(result.value.isActive).toBeTrue();
    }
  });

  it('should accept a minimal payload without optional fields', () => {
    const result = createCompany({ id: 'company-1', name: 'Acme' });

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.rfc).toBeUndefined();
      expect(result.value.contactName).toBeUndefined();
    }
  });

  it('should reject non-object payloads', () => {
    expect(createCompany(null).ok).toBeFalse();
    expect(createCompany('company').ok).toBeFalse();
  });

  it('should reject missing or blank id and name', () => {
    const missingId = createCompany(validCompany({ id: '' }));
    const missingName = createCompany(validCompany({ name: '   ' }));

    expect(missingId.ok).toBeFalse();
    expect(missingName.ok).toBeFalse();
    if (!missingId.ok) {
      expect(missingId.error.map((e) => e.field)).toContain('id');
    }
    if (!missingName.ok) {
      expect(missingName.error.map((e) => e.field)).toContain('name');
    }
  });

  it('should reject non-string optional fields when present', () => {
    const result = createCompany(validCompany({ rfc: 123, contactPhone: true }));

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      const fields = result.error.map((e) => e.field);
      expect(fields).toContain('rfc');
      expect(fields).toContain('contactPhone');
    }
  });

  it('should reject non-boolean status flags when present', () => {
    const result = createCompany(validCompany({ isActive: 'yes' }));

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error.map((e) => e.field)).toContain('isActive');
    }
  });
});
