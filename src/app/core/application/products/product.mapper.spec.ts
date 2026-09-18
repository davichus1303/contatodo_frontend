import { mapProducts } from './product.mapper';

describe('mapProducts', () => {
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

  it('should map a valid collection to domain products', () => {
    const result = mapProducts([validProduct, { ...validProduct, id: 'p2', name: 'Anticucho' }]);

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.length).toBe(2);
      expect(result.value[0].name).toBe('Ceviche');
      expect(result.value[1].urlPhoto).toBeUndefined();
    }
  });

  it('should fail with the offending index when an element is invalid', () => {
    const result = mapProducts([validProduct, { ...validProduct, id: '' }]);

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error.map((error) => error.field)).toContain('products[1].id');
    }
  });

  it('should reject a payload that is not an array', () => {
    expect(mapProducts(null).ok).toBeFalse();
    expect(mapProducts(validProduct).ok).toBeFalse();
    expect(mapProducts('products').ok).toBeFalse();
  });
});
