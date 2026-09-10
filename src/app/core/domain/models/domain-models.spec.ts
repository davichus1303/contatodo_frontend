import { createAcquisitionType } from './acquisition-type.model';
import { createAcquisition } from './acquisition.model';
import { createModule } from './module.model';
import { createSale } from './sale.model';
import { createUser } from './user.model';

describe('createSale', () => {
  const validSale = {
    id: 's1',
    saleNumber: 1,
    productOid: 'p1',
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

  it('should accept a valid sale and preserve every field', () => {
    const result = createSale(validSale);

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.totalSalePrice).toBe(30);
    }
  });

  it('should reject a payload without id', () => {
    const result = createSale({ ...validSale, id: null });

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error.map((currentError) => currentError.field)).toContain('id');
    }
  });

  it('should reject non-numeric sale fields when present', () => {
    const numericFields = ['saleNumber', 'quantity', 'totalCost', 'totalSalePrice'] as const;
    for (const field of numericFields) {
      const result = createSale({ ...validSale, [field]: NaN });

      expect(result.ok).toBeFalse();
      if (!result.ok) {
        expect(result.error.map((currentError) => currentError.field)).toContain(field);
      }
    }
  });
});

describe('createAcquisition', () => {
  const validAcquisition = {
    id: 'a1',
    productName: 'Arroz',
    acquisitionType: 'type-1',
    quantity: 5,
    realCost: 50,
    unitRealCost: 10,
    unitPublicCost: 15,
    supplierName: 'ACME',
    invoiceNumber: 'F001',
    acquisitionDate: '2026-08-21T10:00:00',
    observations: ''
  };

  it('should accept a valid acquisition', () => {
    const result = createAcquisition(validAcquisition);

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.productName).toBe('Arroz');
    }
  });

  it('should reject garbage numeric values', () => {
    const result = createAcquisition({ ...validAcquisition, quantity: 'five' });

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error.map((currentError) => currentError.field)).toContain('quantity');
    }
  });
});

describe('createAcquisitionType', () => {
  it('should reject missing name', () => {
    const result = createAcquisitionType({ id: 't1' });

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error.map((currentError) => currentError.field)).toContain('name');
    }
  });

  it('should reject non-boolean isActive when present', () => {
    const result = createAcquisitionType({ id: 't1', name: 'Compra', isActive: 'yes' });

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error.map((currentError) => currentError.field)).toContain('isActive');
    }
  });

  it('should accept a minimal type without optional flags', () => {
    const result = createAcquisitionType({ id: 't1', name: 'Compra' });

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.affectsInventory).toBeUndefined();
    }
  });
});

describe('createModule', () => {
  it('should require id, name and link', () => {
    const result = createModule({ id: 'm1', name: 'Sales' });

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error.map((currentError) => currentError.field)).toContain('link');
    }
  });

  it('should accept a navigable module', () => {
    const result = createModule({ id: 'm1', name: 'Sales', link: '/sales' });

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.link).toBe('/sales');
      expect(result.value.category).toBeUndefined();
    }
  });
});

describe('createUser', () => {
  it('should reject invalid email', () => {
    const result = createUser({ id: 'u1', email: 'not-an-email' });

    expect(result.ok).toBeFalse();
    if (!result.ok) {
      expect(result.error.map((currentError) => currentError.field)).toContain('email');
    }
  });

  it('should accept a session user with valid email', () => {
    const result = createUser({
      id: 'u1',
      userName: 'david',
      email: 'david@example.com',
      name: 'David',
      createdDate: '2026-01-01',
      updatedDate: '2026-01-01',
      active: true
    });

    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.value.userName).toBe('david');
    }
  });
});
