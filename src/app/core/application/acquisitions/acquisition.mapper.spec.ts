import { mapAcquisitions } from './acquisition.mapper';

describe('mapAcquisitions', () => {
  const validAcquisition = {
    id: 'a1',
    productName: 'Arroz',
    acquisitionType: 'Mercancia',
    quantity: 5,
    realCost: 50,
    unitRealCost: 10,
    unitPublicCost: 15,
    supplierName: 'ACME',
    invoiceNumber: 'F001',
    acquisitionDate: '2026-08-21T10:00:00',
    observations: 'ok'
  };

  it('should map a valid collection to domain acquisitions', () => {
    const result = mapAcquisitions([validAcquisition, { ...validAcquisition, id: 'a2', unitPublicCost: null }]);

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.length).toBe(2);
      expect(result.value[0].productName).toBe('Arroz');
      expect(result.value[1].unitPublicCost).toBeUndefined();
    }
  });

  it('should fail with the offending index when an element is invalid', () => {
    const result = mapAcquisitions([validAcquisition, { ...validAcquisition, id: '' }]);

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error.map((error) => error.field)).toContain('acquisitions[1].id');
    }
  });

  it('should reject a payload that is not an array', () => {
    expect(mapAcquisitions(null).ok).toBeFalse();
    expect(mapAcquisitions(validAcquisition).ok).toBeFalse();
  });
});
