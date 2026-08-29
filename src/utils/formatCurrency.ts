/**
 * Formats a numeric value into Indian Rupee currency format (e.g. ₹5,000, ₹1,25,000)
 */
export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0';
  }
  
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);

  return `₹${formatted}`;
}

export function parseCurrencyInput(value: string | number): number {
  if (typeof value === 'number') return Math.max(0, value);
  const clean = value.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}
