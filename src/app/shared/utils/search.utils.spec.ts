import { filterBySearchTerm, normalizeSearchTerm } from './search.utils';

describe('search.utils', () => {
  describe('normalizeSearchTerm', () => {
    it('should trim and lower-case the term', () => {
      expect(normalizeSearchTerm('  AcMe  ')).toBe('acme');
    });

    it('should return an empty string for nullish input', () => {
      expect(normalizeSearchTerm(null)).toBe('');
      expect(normalizeSearchTerm(undefined)).toBe('');
    });
  });

  describe('filterBySearchTerm', () => {
    interface Item {
      name: string;
      code: string | null;
    }

    const items: Item[] = [
      { name: 'Acme', code: 'A1' },
      { name: 'Globex', code: null }
    ];
    const getSearchableValues = (item: Item): (string | null)[] => [item.name, item.code];

    it('should return every item for a blank term', () => {
      expect(filterBySearchTerm(items, '', getSearchableValues)).toEqual(items);
    });

    it('should match case-insensitively on any searchable value', () => {
      expect(filterBySearchTerm(items, 'acm', getSearchableValues)).toEqual([items[0]]);
      expect(filterBySearchTerm(items, 'a1', getSearchableValues)).toEqual([items[0]]);
    });

    it('should ignore nullish values without throwing', () => {
      expect(filterBySearchTerm(items, 'zzz', getSearchableValues)).toEqual([]);
    });
  });
});
