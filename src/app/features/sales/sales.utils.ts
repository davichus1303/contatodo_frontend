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

/**
 * Formats the sold quantity with the abbreviation of the unit of measure
 * declared in the sale.
 *
 * Legacy sales registered without a unit keep the plain quantity.
 *
 * @param quantity Sold quantity.
 * @param abbrev Abbreviation of the sale unit of measure, when present.
 * @returns Quantity followed by the unit abbreviation.
 */
export function formatSaleQuantity(quantity: number, abbrev?: string): string {
  return abbrev ? `${quantity}${abbrev}` : `${quantity}`;
}
