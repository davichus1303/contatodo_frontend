import { displayOrFallback } from './display.utils';

describe('displayOrFallback', () => {
  it('should return the value when it has content', () => {
    expect(displayOrFallback('Acme', 'N/A')).toBe('Acme');
  });

  it('should return the fallback for empty, blank or nullish values', () => {
    expect(displayOrFallback('', 'N/A')).toBe('N/A');
    expect(displayOrFallback('   ', 'N/A')).toBe('N/A');
    expect(displayOrFallback(null, 'N/A')).toBe('N/A');
    expect(displayOrFallback(undefined, 'N/A')).toBe('N/A');
  });
});
