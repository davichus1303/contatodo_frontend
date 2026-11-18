import { mapDeals } from './deal.mapper';

describe('mapDeals', () => {
  const validDeal = {
    id: 'deal-1',
    productOid: 'product-1',
    unitOfMeasureOid: 'uom-1',
    quantity: 2.5,
    price: 120,
    companyOid: 'company-1',
    createdDate: '2026-11-18T11:17:50.656',
    updateDate: '2026-11-18T11:17:50.656',
    isActive: true,
    isDelete: false
  };

  it('should map a valid collection to domain deals', () => {
    const result = mapDeals([validDeal, { ...validDeal, id: 'deal-2', productOid: 'product-2' }]);

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.length).toBe(2);
      expect(result.value[0].id).toBe('deal-1');
      expect(result.value[1].id).toBe('deal-2');
    }
  });

  it('should fail when an element is invalid', () => {
    const result = mapDeals([validDeal, { ...validDeal, id: '' }]);

    expect(result.ok).toBeFalse();
  });

  it('should reject a payload that is not an array', () => {
    expect(mapDeals(null).ok).toBeFalse();
    expect(mapDeals(validDeal).ok).toBeFalse();
  });
});
