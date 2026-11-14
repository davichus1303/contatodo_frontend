import { toCreateAcquisitionRequest } from './create-acquisition.mapper';
import { Product } from '../../domain/models/product.model';
import { AcquisitionFormModel } from '../../../features/acquisitions/new-acquisition/acquisition-form.model';

describe('toCreateAcquisitionRequest', () => {
  function baseModel(overrides: Partial<AcquisitionFormModel> = {}): AcquisitionFormModel {
    return {
      acquisitionTypeOid: 'type-1',
      productSearchRaw: 'Cemento',
      isNewProduct: false,
      affectsInventory: true,
      unitOfMeasures: [],
      unitOfMeasure: 'uom-kg',
      packSize: null,
      quantity: 5,
      realCost: 100,
      unitPublicCost: null,
      supplierName: null,
      invoiceNumber: null,
      observations: null,
      newProductDescription: null,
      newProductStock: null,
      ...overrides
    };
  }

  it('should always send the type and real cost', () => {
    const request = toCreateAcquisitionRequest(baseModel());

    expect(request.acquisitionTypeOid).toBe('type-1');
    expect(request.realCost).toBe(100);
  });

  it('should send the acquisition unit in both identifier fields', () => {
    const request = toCreateAcquisitionRequest(baseModel({ unitOfMeasure: 'uom-kg' }));

    expect(request.unitOfMeasure).toBe('uom-kg');
    expect(request.unitOfMeasureOid).toBe('uom-kg');
  });

  it('should omit the acquisition unit when the model carries none', () => {
    const request = toCreateAcquisitionRequest(baseModel({ unitOfMeasure: null }));

    expect(request.unitOfMeasure).toBeUndefined();
    expect(request.unitOfMeasureOid).toBeUndefined();
  });

  describe('when the type affects inventory', () => {
    it('should map a typed product name as-is and forward the quantity', () => {
      const request = toCreateAcquisitionRequest(baseModel({ productSearchRaw: '  Cemento ' }));

      expect(request.productName).toBe('  Cemento ');
      expect(request.quantity).toBe(5);
    });

    it('should fall back to the selected product name when a product object is set', () => {
      const request = toCreateAcquisitionRequest(baseModel({
        productSearchRaw: { id: 'p1', name: 'Tabique' } as Product
      }));

      expect(request.productName).toBe('Tabique');
    });

    it('should use an empty name when the raw value is neither string nor product', () => {
      const request = toCreateAcquisitionRequest(baseModel({ productSearchRaw: null }));

      expect(request.productName).toBe('');
    });

    it('should omit the product attribute units and pack size for existing products', () => {
      const request = toCreateAcquisitionRequest(baseModel({
        isNewProduct: false,
        unitOfMeasures: ['uom-kg'],
        packSize: 12
      }));

      expect(request.unitOfMeasures).toBeUndefined();
      expect(request.packSize).toBeUndefined();
    });
  });

  describe('for brand-new products', () => {
    it('should default the quantity to 1 when stock is missing', () => {
      const request = toCreateAcquisitionRequest(baseModel({
        isNewProduct: true,
        newProductStock: null
      }));

      expect(request.quantity).toBe(1);
    });

    it('should include description only for new products', () => {
      const withDescription = toCreateAcquisitionRequest(baseModel({
        isNewProduct: true,
        newProductDescription: 'Producto nuevo'
      }));
      expect(withDescription.description).toBe('Producto nuevo');

      const withoutNewFlag = toCreateAcquisitionRequest(baseModel({
        newProductDescription: 'ignorado'
      }));
      expect(withoutNewFlag.description).toBeUndefined();
    });

    it('should send the product attribute units and pack size', () => {
      const request = toCreateAcquisitionRequest(baseModel({
        isNewProduct: true,
        unitOfMeasures: ['uom-kg', 'uom-doc'],
        unitOfMeasure: 'uom-doc',
        packSize: 12
      }));

      expect(request.unitOfMeasures).toEqual(['uom-kg', 'uom-doc']);
      expect(request.unitOfMeasure).toBe('uom-doc');
      expect(request.packSize).toBe(12);
    });

    it('should omit the pack size when the product is not acquired by pack', () => {
      const request = toCreateAcquisitionRequest(baseModel({
        isNewProduct: true,
        unitOfMeasures: ['uom-kg'],
        packSize: null
      }));

      expect(request.unitOfMeasures).toEqual(['uom-kg']);
      expect(request.packSize).toBeUndefined();
    });

    it('should omit the attribute units when the model carries none', () => {
      const request = toCreateAcquisitionRequest(baseModel({
        isNewProduct: true,
        unitOfMeasures: []
      }));

      expect(request.unitOfMeasures).toBeUndefined();
    });
  });

  describe('when the type does not affect inventory', () => {
    it('should trim the typed product name', () => {
      const request = toCreateAcquisitionRequest(baseModel({
        affectsInventory: false,
        productSearchRaw: '  Renta local  '
      }));

      expect(request.productName).toBe('Renta local');
    });

    it('should omit productName when the raw value is not a plain string', () => {
      const request = toCreateAcquisitionRequest(baseModel({
        affectsInventory: false,
        productSearchRaw: { id: 'p1', name: 'Tabique' } as Product
      }));

      expect(request.productName).toBeUndefined();
    });

    it('should forward the raw quantity even when null (legacy parity)', () => {
      const request = toCreateAcquisitionRequest(baseModel({
        affectsInventory: false,
        quantity: null
      }));

      expect(request.quantity).toBeNull();
    });

    it('should send the acquisition unit without product attributes', () => {
      const request = toCreateAcquisitionRequest(baseModel({
        affectsInventory: false,
        unitOfMeasure: 'uom-kg',
        unitOfMeasures: ['uom-kg'],
        packSize: 12
      }));

      expect(request.unitOfMeasure).toBe('uom-kg');
      expect(request.unitOfMeasures).toBeUndefined();
      expect(request.packSize).toBeUndefined();
    });
  });

  it('should include optional text fields only when truthy', () => {
    const filled = toCreateAcquisitionRequest(baseModel({
      supplierName: 'Proveedor SA',
      invoiceNumber: 'A-123',
      observations: 'Entrega parcial'
    }));

    expect(filled.supplierName).toBe('Proveedor SA');
    expect(filled.invoiceNumber).toBe('A-123');
    expect(filled.observations).toBe('Entrega parcial');

    const empty = toCreateAcquisitionRequest(baseModel());
    expect(empty.supplierName).toBeUndefined();
    expect(empty.invoiceNumber).toBeUndefined();
    expect(empty.observations).toBeUndefined();
  });

  it('should forward the inherited company so the write targets the browsed company', () => {
    const request = toCreateAcquisitionRequest(baseModel(), 'company-1');

    expect(request.companyOid).toBe('company-1');
  });

  it('should omit the company when the session carries no selection', () => {
    const request = toCreateAcquisitionRequest(baseModel());

    expect(request.companyOid).toBeUndefined();
  });
});

