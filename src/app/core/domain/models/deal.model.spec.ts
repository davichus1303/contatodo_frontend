import { createDeal } from './deal.model';

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

describe('createDeal', () => {
  it('should accept a valid payload', () => {
    const result = createDeal(validDeal);

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.id).toBe('deal-1');
      expect(result.value.productOid).toBe('product-1');
      expect(result.value.unitOfMeasureOid).toBe('uom-1');
      expect(result.value.quantity).toBe(2.5);
      expect(result.value.price).toBe(120);
      expect(result.value.companyOid).toBe('company-1');
      expect(result.value.isActive).toBeTrue();
      expect(result.value.isDelete).toBeFalse();
    }
  });

  it('should default boolean flags to false when absent', () => {
    const { isActive, isDelete, ...withoutFlags } = validDeal;

    const result = createDeal(withoutFlags);

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.isActive).toBeFalse();
      expect(result.value.isDelete).toBeFalse();
    }
  });

  it('should accumulate missing or invalid required fields', () => {
    const result = createDeal({});

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      const fields = result.error.map((currentError) => currentError.field);
      expect(fields).toContain('id');
      expect(fields).toContain('productOid');
      expect(fields).toContain('unitOfMeasureOid');
      expect(fields).toContain('companyOid');
      expect(fields).toContain('quantity');
      expect(fields).toContain('price');
    }
  });

  it('should reject non-finite numeric values', () => {
    const result = createDeal({ ...validDeal, quantity: Number.NaN, price: Number.POSITIVE_INFINITY });

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      const fields = result.error.map((currentError) => currentError.field);
      expect(fields).toContain('quantity');
      expect(fields).toContain('price');
    }
  });

  it('should reject a non-boolean flag', () => {
    const result = createDeal({ ...validDeal, isActive: 'yes' });

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error.map((currentError) => currentError.field)).toContain('isActive');
    }
  });
});
