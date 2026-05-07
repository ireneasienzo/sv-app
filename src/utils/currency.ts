/**
 * Currency utilities for Smart Design Vault
 * Uses Ugandan Shillings (UGX) as the default currency
 */

export const CURRENCY_CODE = 'UGX';
export const CURRENCY_SYMBOL = 'UGX';

/**
 * Format price as Ugandan Shillings
 * @param amount - The amount to format
 * @returns Formatted string with UGX prefix
 */
export const formatPrice = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return `${CURRENCY_SYMBOL} 0`;
  }

  // UGX doesn't use decimal places typically, but we'll format with thousands separators
  return `${CURRENCY_SYMBOL} ${numAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
};

/**
 * Format price for display in components
 * @param amount - The amount to format
 * @returns Formatted string ready for display
 */
export const displayPrice = (amount: number | string): string => {
  return formatPrice(amount);
};

/**
 * Parse price string back to number
 * @param priceString - The price string to parse
 * @returns Parsed number or 0 if invalid
 */
export const parsePrice = (priceString: string): number => {
  // Remove UGX prefix and any non-numeric characters except dots and commas
  const cleanString = priceString.replace(/[^\d.,]/g, '');
  const parsed = parseFloat(cleanString.replace(/,/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};
