import { createUnitOfMeasure } from './unit-of-measure.model';

const validUnit = {
  id: 'uom-1',
  name: 'Docena',
  abrev: 'doc',
  isActive: true,
  isDeleted: false,
  isDivisible: false,
  isPack: true,
  companyOid: 'company-1'
};

describe('createUnitOfMeasure', () => {
  it('should accept a valid payload and preserve the pack flag', () => {
    const result = createUnitOfMeasure(validUnit);

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.id).toBe('uom-1');
      expect(result.value.name).toBe('Docena');
      expect(result.value.isPack).toBeTrue();
    }
  });

  it('should default the pack flag to false when absent', () => {
    const { isPack, ...withoutPack } = validUnit;

    const result = createUnitOfMeasure(withoutPack);

    expect(isPack).toBeTrue();
    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.isPack).toBeFalse();
    }
  });

  it('should reject a non-boolean pack flag', () => {
    const result = createUnitOfMeasure({ ...validUnit, isPack: 'yes' });

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error.map((currentError) => currentError.field)).toContain('isPack');
    }
  });

  it('should accumulate the missing identity fields', () => {
    const result = createUnitOfMeasure({});

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      const fields = result.error.map((currentError) => currentError.field);
      expect(fields).toContain('id');
      expect(fields).toContain('name');
      expect(fields).toContain('abrev');
    }
  });
});
