import { mapAcquisitionTypes } from './acquisition-type.mapper';

describe('mapAcquisitionTypes', () => {
  const validType = {
    id: 't1',
    name: 'Mercancia',
    description: 'Producto para vender',
    isActive: true,
    isDeleted: false,
    affectsInventory: true,
    createdDate: '2026-01-01',
    updatedDate: '2026-01-01'
  };

  it('should map a valid collection to domain acquisition types', () => {
    const result = mapAcquisitionTypes([validType, { id: 't2', name: 'Servicio' }]);

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.length).toBe(2);
      expect(result.value[0].name).toBe('Mercancia');
      expect(result.value[1].affectsInventory).toBeUndefined();
    }
  });

  it('should fail with the offending index when an element is invalid', () => {
    const result = mapAcquisitionTypes([validType, { id: '', name: 'Servicio' }]);

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error.map((error) => error.field)).toContain('acquisitionTypes[1].id');
    }
  });

  it('should reject a payload that is not an array', () => {
    expect(mapAcquisitionTypes(null).ok).toBeFalse();
    expect(mapAcquisitionTypes(validType).ok).toBeFalse();
  });
});
