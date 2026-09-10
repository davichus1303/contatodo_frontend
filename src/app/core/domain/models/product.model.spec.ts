import { createProduct, PRODUCT_DESCRIPTION_MAX_LENGTH, PRODUCT_NAME_MAX_LENGTH } from './product.model';

const validProduct = {
  id: 'p1',
  name: 'Ceviche',
  description: 'Fish dish',
  stock: 10,
  code: 'P001',
  realCost: 8,
  unitRealCost: 8,
  unitPublicCost: 15,
  urlPhoto: '',
  isActive: true,
  createdDate: '2026-01-01',
  updatedDate: '2026-01-01'
};

describe('createProduct', () => {
  it('should accept a fully populated payload and preserve every field', () => {
    const result = createProduct(validProduct);

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value).toEqual(validProduct);
    }
  });

  it('should reject non-object payloads', () => {
    const result = createProduct('not-an-object');

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error[0].field).toBe('product');
    }
  });

  it('should reject missing or blank id', () => {
    const withoutId = { ...validProduct, id: '' };
    const withBlankId = { ...validProduct, id: '   ' };

    [withoutId, withBlankId].forEach((currentPayload) => {
      const result = createProduct(currentPayload);
      expect(result.ok).toBeFalse();
      if (!result.ok) {
        expect(result.error.some((currentError) => currentError.field === 'id')).toBeTrue();
      }
    });
  });

  it('should reject missing or blank name', () => {
    const result = createProduct({ ...validProduct, name: undefined });

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error.map((currentError) => currentError.field)).toContain('name');
    }
  });

  const numericFields = ['stock', 'realCost', 'unitRealCost', 'unitPublicCost'] as const;

  it('should reject non-numeric monetary and stock fields when present', () => {
    for (const field of numericFields) {
      const result = createProduct({ ...validProduct, [field]: '12abc' });

      expect(result.ok).toBeFalse();
      if (!result.ok) {
        expect(result.error.map((currentError) => currentError.field)).toContain(field);
      }
    }
  });

  it('should accept payloads whose optional numeric fields are absent (API fidelity)', () => {
    const sparse = { id: 'p2', name: 'Solo' };

    const result = createProduct(sparse);

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.stock).toBeUndefined();
      expect(result.value.name).toBe('Solo');
    }
  });

  it('should expose backend length constraints for forms', () => {
    expect(PRODUCT_NAME_MAX_LENGTH).toBe(100);
    expect(PRODUCT_DESCRIPTION_MAX_LENGTH).toBe(500);
  });
});
