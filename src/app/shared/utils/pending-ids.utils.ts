/**
 * Returns a new {@link Set} of pending ids that adds the given id.
 *
 * The original set is not mutated.
 *
 * @param ids Current set of pending ids.
 * @param id Id to add.
 * @returns New set containing the id.
 */
export function addPendingId(ids: Set<string>, id: string): Set<string> {
  return new Set(ids).add(id);
}

/**
 * Returns a new {@link Set} of pending ids that removes the given id.
 *
 * The original set is not mutated.
 *
 * @param ids Current set of pending ids.
 * @param id Id to remove.
 * @returns New set without the id.
 */
export function removePendingId(ids: Set<string>, id: string): Set<string> {
  const next = new Set(ids);
  next.delete(id);
  return next;
}
