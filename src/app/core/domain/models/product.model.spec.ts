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
  isActive: true,
  createdDate: '2026-01-01',
  updatedDate: '2026-01-01'
};

describe('createProduct', () => {
  it('should accept a fully populated payload and build the product', () => {
    const result = createProduct({ ...validProduct, urlPhoto: 'https://cdn.example.com/p1.png' });

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.id).toBe('p1');
      expect(result.value.name).toBe('Ceviche');
      expect(result.value.stock).toBe(10);
      expect(result.value.urlPhoto).toBe('https://cdn.example.com/p1.png');
      expect(result.value.isActive).toBeTrue();
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

  it('should reject non-numeric monetary and stock fields', () => {
    for (const field of numericFields) {
      const result = createProduct({ ...validProduct, [field]: '12abc' });

      expect(result.ok).toBeFalse();
      if (!result.ok) {
        expect(result.error.map((currentError) => currentError.field)).toContain(field);
      }
    }
  });

  it('should reject payloads missing required numeric fields', () => {
    const { stock, ...withoutStock } = validProduct;

    const result = createProduct(withoutStock);

    expect(stock).toBe(10);
    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error.map((currentError) => currentError.field)).toContain('stock');
    }
  });

  it('should normalize optional text and status fields', () => {
    const result = createProduct({
      ...validProduct,
      id: '  p1  ',
      name: '  Ceviche  ',
      code: '  ',
      description: null,
      urlPhoto: '   ',
      isActive: undefined,
      createdDate: undefined,
      updatedDate: undefined
    });

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.id).toBe('p1');
      expect(result.value.name).toBe('Ceviche');
      expect(result.value.code).toBe('');
      expect(result.value.description).toBe('');
      expect(result.value.urlPhoto).toBeUndefined();
      expect(result.value.isActive).toBeFalse();
      expect(result.value.createdDate).toBe('');
      expect(result.value.updatedDate).toBe('');
    }
  });

  it('should expose backend length constraints for forms', () => {
    expect(PRODUCT_NAME_MAX_LENGTH).toBe(100);
    expect(PRODUCT_DESCRIPTION_MAX_LENGTH).toBe(500);
  });
});
