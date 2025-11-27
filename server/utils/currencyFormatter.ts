/**
 * 💰 Currency Formatter Utility
 * 
 * Solves floating point precision issues in JavaScript
 * Ensures all monetary values display correctly with exactly 2 decimal places
 */

/**
 * Rounds a number to exactly 2 decimal places using proper rounding
 * Prevents floating point errors like 124.50000000000001
 */
export function roundToTwoDecimals(value: number): number {
  if (typeof value !== 'number' || isNaN(value)) {
    return 0;
  }
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Formats a number as USD currency string
 * Always returns format like $1,234.56
 */
export function formatCurrency(amount: number | string | undefined | null): string {
  let numericAmount: number;
  
  if (typeof amount === 'string') {
    numericAmount = parseFloat(amount.replace(/[$,]/g, '')) || 0;
  } else if (typeof amount === 'number') {
    numericAmount = amount;
  } else {
    numericAmount = 0;
  }
  
  const rounded = roundToTwoDecimals(numericAmount);
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(rounded);
}

/**
 * Calculates item total with proper rounding
 * Prevents floating point multiplication errors
 */
export function calculateItemTotal(quantity: number, unitPrice: number): number {
  const qty = typeof quantity === 'number' ? quantity : parseFloat(String(quantity)) || 0;
  const price = typeof unitPrice === 'number' ? unitPrice : parseFloat(String(unitPrice)) || 0;
  return roundToTwoDecimals(qty * price);
}

/**
 * Parses a currency string to number
 * Handles formats like "$1,234.56" or "1234.56"
 */
export function parseCurrency(value: string | number): number {
  if (typeof value === 'number') {
    return roundToTwoDecimals(value);
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[$,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return roundToTwoDecimals(isNaN(parsed) ? 0 : parsed);
  }
  return 0;
}

/**
 * Calculates subtotal from array of items with proper rounding
 */
export function calculateSubtotal(items: Array<{ quantity?: number; unitPrice?: number; totalPrice?: number; total?: number }>): number {
  if (!Array.isArray(items)) return 0;
  
  const sum = items.reduce((acc, item) => {
    const itemTotal = item.totalPrice || item.total || calculateItemTotal(item.quantity || 0, item.unitPrice || 0);
    return acc + (typeof itemTotal === 'number' ? itemTotal : parseCurrency(itemTotal));
  }, 0);
  
  return roundToTwoDecimals(sum);
}

/**
 * Calculates tax amount with proper rounding
 */
export function calculateTax(subtotal: number, taxRate: number): number {
  const rate = taxRate > 1 ? taxRate / 100 : taxRate; // Handle both 10 and 0.10 formats
  return roundToTwoDecimals(subtotal * rate);
}

/**
 * Calculates total with proper rounding
 */
export function calculateTotal(subtotal: number, tax: number, discount: number = 0): number {
  return roundToTwoDecimals(subtotal + tax - discount);
}
