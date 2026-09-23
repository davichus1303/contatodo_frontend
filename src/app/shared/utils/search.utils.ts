/**
 * Normalizes a raw search term so it can be compared case-insensitively.
 *
 * @param term Raw term coming from a search input.
 * @returns The trimmed, lower-cased term, or an empty string when it is absent.
 */
export function normalizeSearchTerm(term: string | null | undefined): string {
  return term?.trim().toLowerCase() ?? '';
}

/**
 * Filters a collection by a term contained in any of its searchable values.
 *
 * Matching is case-insensitive and partial (`contains`). A blank term returns
 * every item unchanged. Non-string values never match.
 *
 * @param items Collection to filter.
 * @param term Normalized search term (see {@link normalizeSearchTerm}).
 * @param getSearchableValues Projects an item to the values used for matching.
 * @returns The matching items, in their original order.
 */
export function filterBySearchTerm<T>(
  items: readonly T[],
  term: string,
  getSearchableValues: (item: T) => readonly (string | null | undefined)[]
): T[] {
  if (!term) {
    return [...items];
  }

  return items.filter((item: T) =>
    getSearchableValues(item).some(
      (value) => typeof value === 'string' && value.toLowerCase().includes(term)
    )
  );
}
