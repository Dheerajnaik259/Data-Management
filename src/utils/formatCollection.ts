/**
 * Helper utilities for formatting collection entity names (singular & plural).
 */

export function formatSingularCollection(col: string): string {
  if (!col) return '';
  const lower = col.toLowerCase();
  if (lower === 'cameramen' || lower === 'cameraman') return 'Cameraman';
  if (lower === 'expenses' || lower === 'expense') return 'Expense';
  if (lower === 'shoots' || lower === 'shoot') return 'Shoot';
  if (lower === 'clients' || lower === 'client') return 'Client';
  return lower.endsWith('s') ? col.slice(0, -1) : col;
}

export function formatPluralCollection(col: string): string {
  if (!col) return '';
  const lower = col.toLowerCase();
  if (lower === 'cameramen' || lower === 'cameraman') return 'Cameramen';
  if (lower === 'expenses' || lower === 'expense') return 'Expenses';
  if (lower === 'shoots' || lower === 'shoot') return 'Shoots';
  if (lower === 'clients' || lower === 'client') return 'Clients';
  return col;
}
