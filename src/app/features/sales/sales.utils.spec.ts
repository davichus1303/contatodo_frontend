import { formatSaleQuantity } from './sales.utils';

describe('formatSaleQuantity', () => {
  it('should append the abbreviation of the unit declared in the sale', () => {
    expect(formatSaleQuantity(2, 'kg')).toBe('2kg');
  });

  it('should keep the plain quantity when the sale has no unit', () => {
    expect(formatSaleQuantity(2)).toBe('2');
    expect(formatSaleQuantity(2, '')).toBe('2');
  });
});
