/**
 * Calculates the gross profit of a sale as total price minus total cost.
 *
 * Nullish values are treated as zero so partial data never yields NaN.
 *
 * @param totalSalePrice Total sale price.
 * @param totalCost Total cost.
 * @returns Profit value.
 */
export function calculateProfit(totalSalePrice: number, totalCost: number): number {
  return (totalSalePrice || 0) - (totalCost || 0);
}

/**
 * Gets the profit color CSS class based on its sign.
 *
 * @param profit Profit value.
 * @returns CSS class ('profit-positive', 'profit-negative' or 'profit-neutral').
 */
export function getProfitColorClass(profit: number): string {
  if (profit > 0) return 'profit-positive';
  if (profit < 0) return 'profit-negative';
  return 'profit-neutral';
}
