import { mapSales } from './sale.mapper';

describe('mapSales', () => {
  const validSale = {
    id: 's1',
    saleNumber: 1,
    productOid: 'p1',
    productName: 'Arroz',
    userOid: 'u1',
    quantity: 2,
    totalCost: 16,
    originalTotalPrice: 30,
    totalSalePrice: 30,
    saleDate: '2026-08-21T12:00:00',
    notes: '',
    createdDate: '2026-08-21T12:00:00',
    updatedDate: '2026-08-21T12:00:00'
  };

  it('should map a valid collection to domain sales', () => {
    const result = mapSales([validSale, { ...validSale, id: 's2', productName: null }]);

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.length).toBe(2);
      expect(result.value[0].productName).toBe('Arroz');
      expect(result.value[1].productName).toBeUndefined();
    }
  });

  it('should fail with the offending index when an element is invalid', () => {
    const result = mapSales([validSale, { ...validSale, id: '' }]);

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error.map((error) => error.field)).toContain('sales[1].id');
    }
  });

  it('should reject a payload that is not an array', () => {
    expect(mapSales(null).ok).toBeFalse();
    expect(mapSales(validSale).ok).toBeFalse();
  });
});